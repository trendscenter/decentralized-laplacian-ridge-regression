# decentralized computation init

1. mkdir YOUR package
1. cd YOUR_PACKAGE
1. `npm init`
  1. update `"main": "src/index.js"`
1. create `src/` & `test/`
1. create `src/index.js`

```js
'use strict';
module.exports = {
  name: "my-computation",
  version: '0.0.1',
  local: {
    type: 'function',
    fn(opts, cb) {

    },
  },
  remote: {
    type: 'function',
    fn(opts, cb) {

    },
  },
};
```

1. fill remote & local objects with `Computation`s.
  1. @NOTE: these are js computations.  other language computations can be injected

```js
'use strict';

const pkg = pkg;
const values = require('lodash/values');

module.exports = {
  name: pkg.name,
  version: pkg.version,
  local: {
    type: 'function',
    fn(opts, cb) {
      const remoteData = opts.remoteResult ? opts.remoteResult.data : null;
      const userStep = opts.previousData || 0;
      const groupStep = remoteData && remoteData.step || 1;
      if (userStep === groupStep) { return cb(); }
      console.log('...bumping', userStep + 1);
      cb(null, userStep + 1);
    },
  },
  remote: {
    type: 'function',
    fn(opts, cb) {
      // stub some default values
      const _default = { step: 1, userStep: {} };

      // construct our current group data from default and past values
      const result = Object.assign({}, _default, opts.previousData);

      // apply user current step(s) to our RemoteComputationResult
      opts.userResults.forEach(usrRslt => {
        result.userStep[usrRslt.username] = usrRslt.data;
      });

      // determine if computation should bump computation step
      const userStepValues = values(result.userStep);
      const allUsersMatch = userStepValues.every(uStep => uStep === result.step);
      const allUsersPresent = userStepValues.length === opts.usernames.length;
      const shouldBumpStep = allUsersMatch && allUsersPresent;

      if (result.step === 3 && allUsersMatch) {
        result.complete = true;
      } else if (shouldBumpStep) {
        result.step += 1;
      }

      // show output for demo
      console.log(opts.userResults.map(rslt => ({
        un: rslt.username,
        data: rslt.data,
      })));

      cb(null, result);
    },
  },
};
```
