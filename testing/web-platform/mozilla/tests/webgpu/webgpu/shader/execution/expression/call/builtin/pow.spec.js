/**
* AUTO-GENERATED - DO NOT EDIT. Source: https://github.com/gpuweb/cts
**/export const description = `
Execution tests for the 'pow' builtin function

S is AbstractFloat, f32, f16
T is S or vecN<S>
@const fn pow(e1: T ,e2: T ) -> T
Returns e1 raised to the power e2. Component-wise when T is a vector.
`;import { makeTestGroup } from '../../../../../../common/framework/test_group.js';
import { GPUTest } from '../../../../../gpu_test.js';
import { TypeF32, TypeF16 } from '../../../../../util/conversion.js';
import { FP } from '../../../../../util/floating_point.js';
import { fullF32Range, fullF16Range } from '../../../../../util/math.js';
import { makeCaseCache } from '../../case_cache.js';
import { allInputSources, run } from '../../expression.js';

import { builtin } from './builtin.js';

export const g = makeTestGroup(GPUTest);

export const d = makeCaseCache('pow', {
  f32_const: () => {
    return FP.f32.generateScalarPairToIntervalCases(
      fullF32Range(),
      fullF32Range(),
      'finite',
      FP.f32.powInterval
    );
  },
  f32_non_const: () => {
    return FP.f32.generateScalarPairToIntervalCases(
      fullF32Range(),
      fullF32Range(),
      'unfiltered',
      FP.f32.powInterval
    );
  },
  f16_const: () => {
    return FP.f16.generateScalarPairToIntervalCases(
      fullF16Range(),
      fullF16Range(),
      'finite',
      FP.f16.powInterval
    );
  },
  f16_non_const: () => {
    return FP.f16.generateScalarPairToIntervalCases(
      fullF16Range(),
      fullF16Range(),
      'unfiltered',
      FP.f16.powInterval
    );
  }
});

g.test('abstract_float').
specURL('https://www.w3.org/TR/WGSL/#float-builtin-functions').
desc(`abstract float tests`).
params((u) =>
u.combine('inputSource', allInputSources).combine('vectorize', [undefined, 2, 3, 4])
).
unimplemented();

g.test('f32').
specURL('https://www.w3.org/TR/WGSL/#float-builtin-functions').
desc(`f32 tests`).
params((u) =>
u.combine('inputSource', allInputSources).combine('vectorize', [undefined, 2, 3, 4])
).
fn(async (t) => {
  const cases = await d.get(t.params.inputSource === 'const' ? 'f32_const' : 'f32_non_const');
  await run(t, builtin('pow'), [TypeF32, TypeF32], TypeF32, t.params, cases);
});

g.test('f16').
specURL('https://www.w3.org/TR/WGSL/#float-builtin-functions').
desc(`f16 tests`).
params((u) =>
u.combine('inputSource', allInputSources).combine('vectorize', [undefined, 2, 3, 4])
).
beforeAllSubcases((t) => {
  t.selectDeviceOrSkipTestCase('shader-f16');
}).
fn(async (t) => {
  const cases = await d.get(t.params.inputSource === 'const' ? 'f16_const' : 'f16_non_const');
  await run(t, builtin('pow'), [TypeF16, TypeF16], TypeF16, t.params, cases);
});