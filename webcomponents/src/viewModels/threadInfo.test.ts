import { ThreadInfo } from './threadInfo';
import {TimeInterval} from "./timeInterval";
import {BeadLink} from "../bindings/threads.types";


/** */
test('add 1', () => {
  let info = new ThreadInfo(new TimeInterval(0, 0));
  info.addItems([]);
  expect(info.beadLinksTree.length).toBe(0);

  const beadLink: BeadLink = {
    indexTime: 42,
    creationTime: 44,
    beadAh: new Uint8Array(),
    beadType: "someType",
  };

  info.addItems([beadLink]);
  expect(info.beadLinksTree.length).toBe(1);
  info.addItems([beadLink]);
  expect(info.beadLinksTree.length).toBe(1);
});


/** */
test('add many on same key', () => {
  let info = new ThreadInfo(new TimeInterval(0, 0));
  const beadLink1: BeadLink = {
    indexTime: 11,
    creationTime: 42,
    beadAh: new Uint8Array(),
    beadType: "someType1",
  };
  const beadLink2: BeadLink = {
    indexTime: 11,
    creationTime: 48,
    beadAh: new Uint8Array(),
    beadType: "someType2",
  };
  info.addItems([beadLink1, beadLink2]);
  expect(info.beadLinksTree.length).toBe(2);
  info.addItems([beadLink1]);
  expect(info.beadLinksTree.length).toBe(2);
  info.addItems([beadLink2]);
  expect(info.beadLinksTree.length).toBe(2);
});
