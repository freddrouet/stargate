// |reftest| skip -- import-attributes is not supported
// This file was procedurally generated from the following sources:
// - src/dynamic-import/import-attributes-trailing-comma-second.case
// - src/dynamic-import/syntax/valid/nested-while.template
/*---
description: ImportCall trailing comma following second parameter (nested while syntax)
esid: sec-import-call-runtime-semantics-evaluation
features: [import-attributes, dynamic-import]
flags: [generated]
info: |
    ImportCall :
        import( AssignmentExpression )

    1. Let referencingScriptOrModule be ! GetActiveScriptOrModule().
    2. Assert: referencingScriptOrModule is a Script Record or Module Record (i.e. is not null).
    3. Let argRef be the result of evaluating AssignmentExpression.
    4. Let specifier be ? GetValue(argRef).
    5. Let promiseCapability be ! NewPromiseCapability(%Promise%).
    6. Let specifierString be ToString(specifier).
    7. IfAbruptRejectPromise(specifierString, promiseCapability).
    8. Perform ! HostImportModuleDynamically(referencingScriptOrModule, specifierString, promiseCapability).
    9. Return promiseCapability.[[Promise]].


    ImportCall :
        import( AssignmentExpression[+In, ?Yield, ?Await] ,opt )
        import( AssignmentExpression[+In, ?Yield, ?Await] , AssignmentExpression[+In, ?Yield, ?Await] ,opt )

---*/

let x = 0;
while (!x) {
  x++;
  import('./empty_FIXTURE.js', {},);
};

reportCompare(0, 0);
