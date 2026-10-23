// Do not let SQL parameters or credentials enter default uncaught-error output.
process.on('uncaughtException',()=>{console.error('Security verification aborted; consult sanitized evidence. Details withheld.');process.exit(1);});
