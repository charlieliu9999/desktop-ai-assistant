// Ambient module shims for legacy modules if accidentally imported by renderer code
declare module '../services/legacy/*' {
  const anyLegacyModule: any;
  export default anyLegacyModule;
}

