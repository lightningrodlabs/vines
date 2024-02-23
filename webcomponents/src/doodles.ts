import {css, html} from "lit";

export const doodle_weave = html`
  <css-doodle>
      @grid: 1 / 100%;
      @content: @svg(
        viewBox: 0 0 1 1;
        preserveAspectRatio: xMidYMid slice;
        rect {
          width, height: 100%;
          fill: defs pattern {
            viewBox: 0 0 14 14;
            patternTransform: rotate(45);
            width, height: 12%;
            path {
              fill: none;
              stroke-linecap: square;
              stroke: #E3EBFF;
              stroke-width: 0.6;
              draw: 0.1s;
              d: M 4 5
              @p(@p(h -1 v -2 h 3 v 4 h -5 v -6 h 6)
              @flipv.reverse.p)
              M 4 9 @flipv.p
            }
          }
        }
      )
  </css-doodle>
`;


export const doodle_threads = html`
  <css-doodle>
      @grid: 1 / 100%;
      @content: @svg(
      viewBox: 0 0 16 16 p 1;
      stroke: #aeacfb;
      stroke-width: .1;
      stroke-linecap: round;
      line*16x16 {
      draw: @r(2s);
      x1, y1, x2, y2: @p(
      @nx(-1) @ny(-1) @nx @ny,
      @nx @ny(-1) @nx(-1) @ny,
      @nx @ny(-1) @nx @ny
      );
      }
      );
  </css-doodle>
`;


export const doodle_comment_manual = html`
    <css-doodle grid="32x1">
        :doodle {
          gap: 1px;
          @size: 100% 100%;
        }
        background: #60569e;
        width: @rand(5%, 100%); /* from 5% to 100% by random */
    </css-doodle>
`;

export const doodle_leafs = html`
    <css-doodle>
    @grid: 1 / 100%;
    background-color: #332B33;
    background-image: @doodle(
    :doodle {
    @grid: 1 / 10000px;
    transform: scale(1.5) rotate(45deg);
    }
    background-size: 50px 50px;
    background-image: @doodle(
    :doodle {
    @grid: 8x1 / 90%;
    border-radius: 0% 60%;
    }
    position: absolute;
    border: 1px solid #BCB8BB;
    @nth(1) { border-radius: 0% 60%; }
    @size: calc(100% - 100% / @I * (@i - 1));
    background: linear-gradient(
    45deg, @stripe(transparent, #BCB8BB 1px, transparent)
    );
    );
    );
    </css-doodle>
`;


export const doodle_flowers = html`
    <css-doodle>
        :doodle {
        flex: none;
        @grid: 25x1;
        @size: 100% 100%;
        overflow: hidden;
        }

        --colors: (#75b9be,#696d7d,#d72638,#f49d37,#140f2d);
        --color-1: @p(--colors);
        --color-2: @P;
        --transform: translateY(@r(2, 90)%);
        --size: 30px;
        transform: var(--transform) rotate(0deg);
        transform-origin: 50% 100%;

        @random(0.5) {
        animation: swing @r(3, 5)s ease infinite alternate both;
        }
        @random(0.5) {
        animation: swingLeft @r(3, 5)s ease infinite alternate both;
        }

        @keyframes swing {
        0% {
        transform: var(--transform) rotate(0deg);
        }
        100% {
        transform: var(--transform) rotate(1deg);
        }
        }

        @keyframes swingLeft {
        0% {
        transform: var(--transform) rotate(0deg);
        }
        100% {
        transform: var(--transform) rotate(-1deg);
        }
        }

        ::after {
        content: "";
        position: absolute;
        top: -15px;
        left: calc(50% - var(--size) / 2);
        width: var(--size);
        height: var(--size);
        background: @p(
        radial-gradient(@stripe(@m4(var(--color-@pn(1, 2))), transparent 29.7%)),
        @doodle(
        @grid: 1 / 100%;
        ::after {
        content: "@p(✿,❁,❀,❃,❊)";
        position: absolute;
        top: -4px;
        left: 50%;
        transform: translate3d(-50%, 0, 0);
        font-size: 40px;
        color: transparent;
        background-image: radial-gradient(var(--color-1) 20%, var(--color-2) calc(20% + 0.5px));
        -webkit-background-clip: text;
        }
        ),
        @doodle(
        @grid: 1 / 100%;
        ::after {
        content: "@p(🌸,🌼)";
        position: absolute;
        top: 0;
        left: 50%;
        transform: translate3d(-50%, 0, 0);
        font-size: 28px;
        color: transparent;
        background-image: radial-gradient(var(--color-1) 20%, var(--color-2) calc(20% + 0.5px));
        -webkit-background-clip: text;
        }
        )
        );
        }

        background: @doodle(
        @grid: 1x40;
        background: linear-gradient(90deg, @stripe(transparent, @p(--colors) 2px, transparent));

        @nth(1, 2) {
        ::before { display: none; }
        }

        @random(.5) {
        ::before {
        content: "";
        @place: 10px center;
        @size: 50% 100%;
        border-radius: 0 100% 0 100%;
        background: @p(--colors);
        -webkit-box-reflect: @p(right, initial);
        }
        }
        );
    </css-doodle>
`;
