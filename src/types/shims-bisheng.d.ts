// Ambient module shims for bisheng-integration to avoid pulling its TS into renderer checks
declare module '../../../bisheng-integration/*' {
  const anyModule: any;
  export default anyModule;
}

