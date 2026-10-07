import { GAME_TITLE } from './data/tuning';
import { Game } from './game';

document.title = GAME_TITLE;
const canvas = document.querySelector<HTMLCanvasElement>('#game');
if (!canvas) throw new Error('canvas #game missing');
new Game(canvas, new URLSearchParams(window.location.search)).start();
