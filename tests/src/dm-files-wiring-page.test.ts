// @vitest-environment happy-dom
import { assert, test } from 'vitest';

import { VinesPage } from '../../webapp/src/vines-page';

// Same rule as dm-files-wiring.test.ts, for the page that accepts DM deliveries: the files
// DVM subscription assigns the same perspective object on every delivery signal.

const sameObject = {};

test('<vines-page> re-runs its DM delivery maintenance on every files DVM notification', () => {
  const options = (VinesPage as any).elementProperties.get('filesPerspective');
  assert.ok(options, 'filesPerspective is a declared property');
  assert.isTrue(options.hasChanged(sameObject, sameObject));
});
