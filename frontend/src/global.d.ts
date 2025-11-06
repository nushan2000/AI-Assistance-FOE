// src/global.d.ts
/// <reference types="vite/client" />

// Allow importing CSS/SCSS as side-effect imports (no value needed)
declare module '*.css';
declare module '*.scss';
declare module '*.sass';

// If you import CSS modules (e.g. styles.module.css), give a simple typed shape:
// Uncomment if using CSS Modules
// declare module '*.module.css' {
//   const classes: { [key: string]: string };
//   export default classes;
// }
// declare module '*.module.scss' {
//   const classes: { [key: string]: string };
//   export default classes;
// }

// Allow image imports
declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.gif';
declare module '*.svg';
declare module '*.webp';
