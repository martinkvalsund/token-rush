import '@fontsource/rajdhani/600.css';
import '@fontsource/rajdhani/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import './ui/styles.css';
import { GAME_TITLE } from './data/tuning';
import { Game } from './game';

document.title = GAME_TITLE;
const canvas = document.querySelector<HTMLCanvasElement>('#game');
if (!canvas) throw new Error('canvas #game missing');
const game = new Game(canvas, new URLSearchParams(window.location.search));
void game.start();
// Exposed for Playwright screenshots and debugging.
(window as unknown as { __game: Game }).__game = game;
