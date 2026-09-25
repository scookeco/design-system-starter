/**
 * Proves every lint and type rule actually fires.
 *
 * Each file in fixtures/violations/ holds one deliberate violation and a header:
 *   // @expect <rule id> [/message regex/]
 *   // @as <path the file is linted as>        (ESLint and Stylelint fixtures)
 * fixtures/clean/ holds negative controls that must produce no errors at all.
 *
 * A green run cannot mean "rule not loaded":
 *  - every rule in REQUIRED must be covered by a fixture, and every fixture must expect a REQUIRED rule;
 *  - the expected rule must report at error severity;
 *  - a fixture that is ignored, or fails to parse, is a failure, not a pass;
 *  - the clean controls must lint with zero errors, so the harness can tell good from bad.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { ESLint } from 'eslint';
import stylelint from 'stylelint';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');

const REQUIRED = {
  eslint: [
    'no-restricted-imports',
    'no-restricted-syntax',
    '@eslint-community/eslint-comments/require-description',
    '@eslint-community/eslint-comments/no-unlimited-disable',
    'unused-disable-directive',
    '@typescript-eslint/no-explicit-any',
    'react-hooks/rules-of-hooks',
  ],
  stylelint: [
    'scale-unlimited/declaration-strict-value',
    'color-no-hex',
    'color-named',
    'function-disallowed-list',
    'declaration-property-value-disallowed-list',
    'declaration-property-value-allowed-list',
    'declaration-no-important',
    'selector-max-id',
    'selector-max-specificity',
    'max-nesting-depth',
    'csstools/use-logical',
    'selector-class-pattern',
    '--report-descriptionless-disables',
    '--report-needless-disables',
  ],
  typescript: ['typescript-closed-api'],
} as const;

interface Fixture {
  file: string;
  expect: string;
  message: RegExp | undefined;
  as: string | undefined;
  code: string;
}

const readFixtures = (dir: string): Fixture[] =>
  readdirSync(join(root, dir))
    .sort()
    .map((name) => {
      const file = join(dir, name);
      const code = readFileSync(join(root, file), 'utf8');
      const expectMatch = /@expect[ \t]+(\S+)(?:[ \t]+\/(.+?)\/)?/.exec(code);
      if (!expectMatch?.[1]) throw new Error(`${file}: missing "@expect <rule>" header`);
      const asMatch = /@as[ \t]+([^\s*]+)/.exec(code);
      return {
        file,
        expect: expectMatch[1],
        message: expectMatch[2] ? new RegExp(expectMatch[2]) : undefined,
        as: asMatch?.[1],
        code,
      };
    });

const failures: string[] = [];
const passes: string[] = [];
const fail = (fixture: Fixture, why: string) => failures.push(`✗ ${fixture.file}: ${why}`);
const pass = (fixture: Fixture, what: string) => passes.push(`✓ ${basename(fixture.file).padEnd(44)} ${what}`);

const eslint = new ESLint({ cwd: root });

const runEslint = async (fixture: Fixture, clean: boolean) => {
  if (!fixture.as) return fail(fixture, 'missing "@as <path>" header');
  const filePath = join(root, fixture.as);
  if (await eslint.isPathIgnored(filePath)) return fail(fixture, `${fixture.as} is ignored by ESLint, so nothing would be checked`);
  const [result] = await eslint.lintText(fixture.code, { filePath, warnIgnored: true });
  const messages = result?.messages ?? [];
  const fatal = messages.find((m) => m.fatal);
  if (fatal) return fail(fixture, `does not parse: ${fatal.message}`);
  const errors = messages.filter((m) => m.severity === 2);
  if (clean) {
    return errors.length === 0
      ? pass(fixture, 'clean control: 0 errors')
      : fail(fixture, `clean control reported: ${errors.map((m) => `${m.ruleId ?? 'directive'}: ${m.message}`).join('; ')}`);
  }
  const hit = errors.find((m) =>
    fixture.expect === 'unused-disable-directive'
      ? m.ruleId === null && /Unused eslint-disable directive/.test(m.message)
      : m.ruleId === fixture.expect && (!fixture.message || fixture.message.test(m.message)),
  );
  return hit
    ? pass(fixture, `caught by ${fixture.expect}`)
    : fail(fixture, `expected ${fixture.expect}${fixture.message ? ` ${String(fixture.message)}` : ''}; got ${errors.map((m) => m.ruleId ?? m.message).join(', ') || 'no errors'}`);
};

const runStylelint = async (fixture: Fixture, clean: boolean) => {
  if (!fixture.as) return fail(fixture, 'missing "@as <path>" header');
  const { results } = await stylelint.lint({
    code: fixture.code,
    codeFilename: join(root, fixture.as),
    configFile: join(root, 'stylelint.config.mjs'),
    cwd: root,
  });
  const result = results[0];
  if (!result || result.ignored) return fail(fixture, `${fixture.as} is ignored by Stylelint, so nothing would be checked`);
  const parseError = result.warnings.find((w) => w.rule === 'CssSyntaxError');
  if (parseError) return fail(fixture, `does not parse: ${parseError.text}`);
  const errors = result.warnings.filter((w) => w.severity === 'error');
  if (clean) {
    return errors.length === 0
      ? pass(fixture, 'clean control: 0 errors')
      : fail(fixture, `clean control reported: ${errors.map((w) => w.text).join('; ')}`);
  }
  return errors.some((w) => w.rule === fixture.expect)
    ? pass(fixture, `caught by ${fixture.expect}`)
    : fail(fixture, `expected ${fixture.expect}; got ${errors.map((w) => w.rule).join(', ') || 'no errors'}`);
};

const tsOptions = (() => {
  const configPath = join(root, 'tsconfig.json');
  const { config } = ts.readConfigFile(configPath, (p) => ts.sys.readFile(p));
  return ts.parseJsonConfigFileContent(config, ts.sys, dirname(configPath)).options;
})();

const runTypeScript = (fixture: Fixture, clean: boolean) => {
  const program = ts.createProgram({ rootNames: [join(root, fixture.file)], options: tsOptions });
  const diagnostics = ts.getPreEmitDiagnostics(program).map((d) => ({
    file: d.file?.fileName ?? '',
    text: ts.flattenDiagnosticMessageText(d.messageText, ' '),
  }));
  if (clean) {
    return diagnostics.length === 0
      ? pass(fixture, 'clean control: 0 type errors')
      : fail(fixture, `clean control has type errors: ${diagnostics.map((d) => d.text).join('; ')}`);
  }
  // Every diagnostic must be the closed-API rejection, so a broken import can't masquerade as a pass.
  const offTopic = diagnostics.filter((d) => !d.file.endsWith(fixture.file) || !/'(className|style)'/.test(d.text));
  if (diagnostics.length < 2 || offTopic.length > 0) {
    return fail(fixture, `expected exactly the className and style rejections; got: ${diagnostics.map((d) => d.text).join('; ') || 'no errors'}`);
  }
  return pass(fixture, `caught by the compiler (${String(diagnostics.length)} closed-API errors)`);
};

const run = async (fixture: Fixture, clean: boolean) => {
  if (fixture.expect.startsWith('typescript')) return runTypeScript(fixture, clean);
  if (fixture.file.endsWith('.css')) return runStylelint(fixture, clean);
  return runEslint(fixture, clean);
};

const violations = readFixtures('fixtures/violations');
const controls = readFixtures('fixtures/clean');

// Coverage in both directions.
const required = new Set<string>(Object.values(REQUIRED).flat());
const covered = new Set(violations.map((f) => f.expect));
for (const rule of required) if (!covered.has(rule)) failures.push(`✗ no fixture proves "${rule}" fires`);
for (const f of violations) if (!required.has(f.expect)) failures.push(`✗ ${f.file}: expects "${f.expect}", which is not in REQUIRED`);

// Normal lint must not see the fixtures (they are errors by design).
if (!(await eslint.isPathIgnored(join(root, violations[0]?.file ?? 'fixtures/x.tsx')))) {
  failures.push('✗ fixtures/ is not ignored by the normal ESLint run');
}

for (const fixture of violations) await run(fixture, false);
for (const fixture of controls) await run(fixture, true);

console.log(passes.join('\n'));
if (failures.length > 0) {
  console.error(`\n${failures.join('\n')}\n\ntest:rules: ${String(failures.length)} problem(s)`);
  process.exitCode = 1;
} else {
  console.log(`\ntest:rules: ${String(violations.length)} violations caught, ${String(controls.length)} clean controls, ${String(required.size)} rules covered`);
}
