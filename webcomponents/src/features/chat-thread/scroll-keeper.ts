/**
 * Keeps a message list on its newest message for as long as the reader wants
 * to be there, and out of their way once they do not.
 *
 * The list is an ordinary top-anchored scroller: oldest message first, newest
 * at scrollHeight. Three things move the view, and the keeper tells them apart
 * by who asked:
 *
 * - The reader, with a gesture: wheel, touch, keys, or a pointer held down
 *   (a scrollbar drag). Their intent is read off where they scrolled to: near
 *   the bottom means "follow the newest message", anywhere else means "I am
 *   reading history". A wheel notch or finger movement towards older messages
 *   releases the view synchronously, in the event handler, so nothing below
 *   can override it in the same frame.
 * - The content, growing as messages render, embeds size themselves, and older
 *   messages are added above. While following, a ResizeObserver puts the
 *   bottom back; it runs after layout and before paint, so the correction is
 *   never visible. While reading history, the browser's scroll anchoring keeps
 *   the message under the reader still, and beforeRender()/afterRender() do
 *   the same across a lit render for browsers without it.
 * - Code, on purpose: a jump to a bead, a "go to top" button. Those go through
 *   reveal() or release(), which stop the following first. A scroll nobody
 *   asked for while following -- a stray focus() scrolling something into
 *   view, say -- is put back once.
 *
 * Checked in a browser harness (Chromium 127 and 151; Moss's Electron 32 is
 * Chromium 128) against the growth pattern a thread shows on opening: items rendering one line high and
 * inflating over the following seconds, history prepended while reading, wheel
 * input during the growth. There is deliberately no per-frame loop and no held
 * offset. The previous design corrected the view every frame for 8 seconds
 * after a thread opened and could not tell the reader's motion from the
 * content's, which is what made the wheel feel resisted.
 */
export interface ScrollKeeperOptions {
  /** The scrolling element, or nothing before it exists. */
  scroller: () => HTMLElement | null | undefined;
  /** The element that grows as messages render, or nothing before it exists. */
  content: () => Element | null | undefined;
  /** The reader scrolled towards older messages and is near the top. */
  onNearTop?: () => void;
  /** Within this many px of the bottom the reader still counts as being at the
   *  newest message. Tolerant on purpose: it reads intent, and a few px either
   *  way should not flip it. The view is still put back exactly on the bottom. */
  tolerance?: number;
  /** The elements the reader's place is held on across a render. */
  anchorSelector?: string;
}


/** Within this many px of the top, scrolling up asks for older messages. */
const NEAR_TOP_PX = 100;
/** How long after a gesture its scroll events still count as the reader's.
 *  Trackpad momentum keeps sending wheel events, so this renews itself. */
const GESTURE_MS = 250;


/** */
export class ScrollKeeper {

  /** The view follows the newest message. */
  following: boolean = true;

  private _scroller: HTMLElement | undefined = undefined;
  private _unbind: (() => void) | undefined = undefined;
  private _observer: ResizeObserver | undefined = undefined;
  private _observed: Element | undefined = undefined;
  private _gestureUntil: number = 0;
  private _pointerDown: boolean = false;
  private _touchY: number | undefined = undefined;
  private _anchor: {el: Element, top: number} | undefined = undefined;

  constructor(private readonly _opts: ScrollKeeperOptions) {}


  /** px between the bottom of the view and the newest message. */
  distanceFromNewest(): number {
    const s = this._scroller ?? this._opts.scroller();
    if (!s) {
      return 0;
    }
    return Math.max(0, s.scrollHeight - s.clientHeight - s.scrollTop);
  }


  /** Bind to the scroller and watch the content. Meant to be called on every
   *  update: neither may exist until the thread has data, and the asset view's
   *  list is rebuilt when it arrives. Does nothing once bound. */
  attach(): void {
    const scroller = this._opts.scroller();
    if (scroller && scroller != this._scroller) {
      this._unbind?.();
      this._bind(scroller);
    }
    const content = this._opts.content();
    if (content && content != this._observed) {
      const observer = this._observerOrCreate();
      if (this._observed) {
        observer.unobserve(this._observed);
      }
      observer.observe(content);
      this._observed = content;
    }
  }


  /** */
  detach(): void {
    this._unbind?.();
    this._unbind = undefined;
    this._scroller = undefined;
    this._observer?.disconnect();
    this._observer = undefined;
    this._observed = undefined;
    this._anchor = undefined;
  }


  /** Go to the newest message and stay on it: opening a thread, sending. */
  follow(): void {
    this.following = true;
    /** The pin below is not the reader's doing, even right after a wheel notch
     *  -- read as theirs, a message landing in the same frame would leave the
     *  view one message short of the bottom and no longer following. */
    this._gestureUntil = 0;
    this._pin();
  }


  /** Stop following. For code that is about to move the view on purpose. */
  release(): void {
    this.following = false;
  }


  /** Bring an element into the middle of the view. The reader asked for that
   *  message, so the view stops following the newest one. */
  reveal(el: Element): void {
    const s = this._scroller ?? this._opts.scroller();
    if (!s) {
      return;
    }
    this.release();
    const rect = el.getBoundingClientRect();
    const top = rect.top - s.getBoundingClientRect().top + s.scrollTop
      - Math.max(0, (s.clientHeight - rect.height) / 2);
    s.scrollTo({top, behavior: "smooth"});
  }


  /** Call before a render that may add or remove content above what the reader
   *  is looking at. Records which message is at the top of the view. */
  beforeRender(): void {
    this._anchor = undefined;
    const s = this._scroller;
    if (!s || this.following) {
      return;
    }
    const viewTop = s.getBoundingClientRect().top;
    const items = (this._observed ?? s).querySelectorAll(this._opts.anchorSelector ?? "chat-item");
    for (const el of Array.from(items)) {
      const rect = el.getBoundingClientRect();
      if (rect.bottom > viewTop) {
        this._anchor = {el, top: rect.top};
        return;
      }
    }
  }


  /** Call after that render. Puts the recorded message back where it was. On a
   *  browser with scroll anchoring this measures no difference and does
   *  nothing; the anchoring already ran as part of layout. */
  afterRender(): void {
    const anchor = this._anchor;
    this._anchor = undefined;
    const s = this._scroller;
    if (!anchor || !s || this.following || !anchor.el.isConnected) {
      return;
    }
    const delta = anchor.el.getBoundingClientRect().top - anchor.top;
    if (Math.abs(delta) > 1) {
      s.scrollTop += delta;
    }
  }


  /** -- Private -- */

  private _observerOrCreate(): ResizeObserver {
    if (!this._observer) {
      this._observer = new ResizeObserver(() => {
        if (this.following) {
          this._pin();
        }
      });
    }
    return this._observer;
  }


  /** */
  private _bind(scroller: HTMLElement) {
    this._scroller = scroller;
    /** The list shrinks when the input bar grows as someone types. */
    this._observerOrCreate().observe(scroller);

    const canScrollUp = () => scroller.scrollTop > 0;
    const onWheel = (e: WheelEvent) => {
      this._markGesture();
      if (e.deltaY < 0) {
        /** Only when there is somewhere to go: on a short list, or at the top
         *  of history, the wheel moves nothing and means nothing. */
        if (canScrollUp()) {
          this.following = false;
        }
        if (scroller.scrollTop < NEAR_TOP_PX) {
          this._opts.onNearTop?.();
        }
      }
    };
    const onTouchStart = (e: TouchEvent) => {
      this._markGesture();
      this._touchY = e.touches[0]?.clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      this._markGesture();
      const y = e.touches[0]?.clientY;
      if (y === undefined) {
        return;
      }
      /** A finger moving down drags the content down: towards older messages. */
      if (this._touchY !== undefined && y > this._touchY && canScrollUp()) {
        this.following = false;
      }
      this._touchY = y;
    };
    const onKeyDown = (e: KeyboardEvent) => {
      this._markGesture();
      if ((e.key == "ArrowUp" || e.key == "PageUp" || e.key == "Home") && canScrollUp()) {
        this.following = false;
      }
    };
    const onPointerDown = () => {
      this._pointerDown = true;
      this._markGesture();
    };
    const onPointerUp = () => {
      this._pointerDown = false;
      this._markGesture();
    };
    const onScroll = () => this._onScroll();

    scroller.addEventListener("wheel", onWheel, {passive: true});
    scroller.addEventListener("touchstart", onTouchStart, {passive: true});
    scroller.addEventListener("touchmove", onTouchMove, {passive: true});
    scroller.addEventListener("keydown", onKeyDown);
    scroller.addEventListener("pointerdown", onPointerDown);
    scroller.addEventListener("scroll", onScroll, {passive: true});
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("blur", onPointerUp);
    this._unbind = () => {
      scroller.removeEventListener("wheel", onWheel);
      scroller.removeEventListener("touchstart", onTouchStart);
      scroller.removeEventListener("touchmove", onTouchMove);
      scroller.removeEventListener("keydown", onKeyDown);
      scroller.removeEventListener("pointerdown", onPointerDown);
      scroller.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("blur", onPointerUp);
      this._observer?.unobserve(scroller);
      this._pointerDown = false;
    };
  }


  /** */
  private _markGesture() {
    this._gestureUntil = performance.now() + GESTURE_MS;
  }


  /** */
  private _isGesture(): boolean {
    return this._pointerDown || performance.now() < this._gestureUntil;
  }


  /** */
  private _onScroll() {
    const distance = this.distanceFromNewest();
    if (this._isGesture()) {
      /** The reader's own scrolling says what they want. */
      this.following = distance <= (this._opts.tolerance ?? 60);
      if (!this.following && this._scroller!.scrollTop < NEAR_TOP_PX) {
        this._opts.onNearTop?.();
      }
      return;
    }
    /** Nobody asked for this one. While following, put the view back; while
     *  reading history it is the browser holding the reader's place, or a jump
     *  that went through release() first. */
    if (this.following && distance > 1) {
      this._pin();
    }
  }


  /** */
  private _pin() {
    const s = this._scroller ?? this._opts.scroller();
    if (!s) {
      return;
    }
    s.scrollTop = s.scrollHeight;
  }
}
