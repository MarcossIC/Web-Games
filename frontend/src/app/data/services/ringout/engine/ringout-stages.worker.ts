/// <reference lib="webworker" />
import { answerStageRequest, type StageRequest } from './generator';

/**
 * Infinite builds its boards here, off the page's thread: proving a big
 * board clearable takes a second or two, and the board on screen has to
 * keep answering meanwhile.
 */
addEventListener('message', ({ data }: MessageEvent<StageRequest>) => {
  postMessage(answerStageRequest(data));
});
