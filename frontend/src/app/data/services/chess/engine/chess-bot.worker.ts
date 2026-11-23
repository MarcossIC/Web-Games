/// <reference lib="webworker" />
import { BotRequest, answerBotRequest } from './chess-bot';
import { Search } from './search';

/**
 * The machine thinks here, off the page's thread: a search takes over a
 * second, and the board has to keep answering taps meanwhile.
 */
const search = new Search();

addEventListener('message', ({ data }: MessageEvent<BotRequest>) => {
  postMessage(answerBotRequest(data, search));
});
