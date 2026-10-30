// @vitest-environment happy-dom
import { assert, test } from 'vitest';

import { ActionId, AgentId } from '@ddd-qc/lit-happ';
import { ThreadsPerspectiveMutable } from '../../webcomponents/src/viewModels/threads.perspective';
import { Thread } from '../../webcomponents/src/viewModels/thread';

// Where a thread is filed is decided by the newest "Threads" link. Re-filing must leave the
// thread in exactly one category and must count as a change, or the ZVM's notifySubscribers()
// (which compares comparable() snapshots) never tells the sidebar to redraw.

const topicA = ActionId.empty(1);
const topicB = ActionId.empty(2);
const ppAh = ActionId.empty(3);

function perspectiveWithChannelIn(topic: ActionId): ThreadsPerspectiveMutable {
  const p = new ThreadsPerspectiveMutable();
  const pp = {
    purpose: 'general',
    subject: { address: topic.b64, name: 'cat', typeName: 'SemanticTopic', dnaHashB64: '', appletId: '' },
    moderation: { instructions: '', allowedFlags: 0, moderators: [], canDeleteThread: false },
    limitations: { canWal: true, canFile: null, canText: null, allowedAgents: [], maybeAgentRateLimiting: null },
  } as any;
  p.threads.set(ppAh, new Thread(pp, 'general', 0, 1000, AgentId.empty()));
  p.fileThread(ppAh, topic, 0);
  return p;
}

const same = (a: Object, b: Object) => Object.entries(a).toString() == Object.entries(b).toString();

test('re-filing a thread moves it to exactly one category', () => {
  const p = perspectiveWithChannelIn(topicA);
  assert.deepEqual(p.getSubjectThreads(topicA).map((a) => a.b64), [ppAh.b64]);
  assert.deepEqual(p.getSubjectThreads(topicB), []);

  assert.isTrue(p.fileThread(ppAh, topicB, 5));
  assert.deepEqual(p.getSubjectThreads(topicA), []);
  assert.deepEqual(p.getSubjectThreads(topicB).map((a) => a.b64), [ppAh.b64]);
  assert.equal(p.getThreadSubject(ppAh)!.b64, topicB.b64);
});

test('an older link does not undo a newer filing', () => {
  const p = perspectiveWithChannelIn(topicA);
  p.fileThread(ppAh, topicB, 5);
  assert.isFalse(p.fileThread(ppAh, topicA, 3));
  assert.deepEqual(p.getSubjectThreads(topicA), []);
  assert.deepEqual(p.getSubjectThreads(topicB).map((a) => a.b64), [ppAh.b64]);
});

test('re-filing changes the comparable snapshot', () => {
  const p = perspectiveWithChannelIn(topicA);
  const before = p.comparable();
  assert.isTrue(same(before, p.comparable()), 'stable when nothing changed');
  p.fileThread(ppAh, topicB, 5);
  assert.isFalse(same(before, p.comparable()), 'a move must register as a change');
});
