/**
 * ESLint rule starter/drag-needs-alternative (WCAG 2.2 SC 2.5.7 Dragging Movements, AA).
 *
 * Anything that can be dragged must also work with a single pointer and no drag: Move up / Move
 * down buttons, a "Move to…" menu item, a Browse button beside a drop zone. The rule makes the
 * author declare that alternative where the drag is built:
 *
 *  - A JSX element that takes part in a drag (draggable, an onDrag… or onDrop handler, or both
 *    onPointerDown and onPointerMove, or onMouseDown and onMouseMove) must carry
 *    data-drag-alternative="<the control that does the same without dragging>".
 *  - A file that imports a drag-and-drop library must carry data-drag-alternative on at least one
 *    element (the library's props are spread, so the draggable element itself can't be seen).
 *
 * It can't see drags wired with addEventListener in an effect; those need review.
 */

const DRAG_ATTRIBUTES = new Set(['draggable', 'onDragStart', 'onDrag', 'onDragEnd', 'onDragEnter', 'onDragOver', 'onDragLeave', 'onDrop']);
const POINTER_DRAGS = [
  ['onPointerDown', 'onPointerMove'],
  ['onMouseDown', 'onMouseMove'],
  ['onTouchStart', 'onTouchMove'],
];
const DRAG_LIBRARIES = [
  /^@dnd-kit\//,
  /^react-dnd(-|$)/,
  /^react-beautiful-dnd$/,
  /^@hello-pangea\/dnd$/,
  /^@atlaskit\/pragmatic-drag-and-drop/,
  /^(react-)?sortablejs$/,
  /^react-draggable$/,
  /^react-rnd$/,
  /^react-grid-layout$/,
  /^interactjs$/,
];
const ALTERNATIVE = 'data-drag-alternative';

const nameOf = (attribute) => (attribute.type === 'JSXAttribute' && attribute.name.type === 'JSXIdentifier' ? attribute.name.name : undefined);

/** draggable={false} and draggable="false" opt out of dragging. */
const isFalse = (attribute) =>
  attribute.value !== null &&
  ((attribute.value.type === 'Literal' && String(attribute.value.value) === 'false') ||
    (attribute.value.type === 'JSXExpressionContainer' && attribute.value.expression.type === 'Literal' && attribute.value.expression.value === false));

/** A non-empty string, or any expression (the text may come from a translation). */
const declares = (attribute) =>
  attribute.value !== null && !(attribute.value.type === 'Literal' && String(attribute.value.value).trim() === '');

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'problem',
    docs: { description: 'Every drag needs a declared single-pointer alternative (WCAG 2.2 SC 2.5.7).' },
    schema: [],
    messages: {
      element:
        'Dragging needs a single-pointer alternative (WCAG 2.2 SC 2.5.7). Build one (Move up/down buttons, a "Move to…" menu item, a Browse button) and name it here: {{attribute}}="<what does the same without dragging>".',
      library:
        'A drag-and-drop library needs a single-pointer alternative for every drag (WCAG 2.2 SC 2.5.7). Put {{attribute}}="<what does the same without dragging>" on each draggable element.',
    },
  },
  create(context) {
    let libraryImport;
    let declared = false;
    return {
      ImportDeclaration(node) {
        if (DRAG_LIBRARIES.some((pattern) => pattern.test(String(node.source.value)))) libraryImport ??= node;
      },
      JSXOpeningElement(node) {
        const attributes = new Map(node.attributes.map((a) => [nameOf(a), a]).filter(([name]) => name !== undefined));
        const alternative = attributes.get(ALTERNATIVE);
        if (alternative && declares(alternative)) {
          declared = true;
          return;
        }
        const drags =
          [...attributes].some(([name, attribute]) => DRAG_ATTRIBUTES.has(name) && !(name === 'draggable' && isFalse(attribute))) ||
          POINTER_DRAGS.some(([down, move]) => attributes.has(down) && attributes.has(move));
        if (drags) context.report({ node, messageId: 'element', data: { attribute: ALTERNATIVE } });
      },
      'Program:exit'() {
        if (libraryImport && !declared) context.report({ node: libraryImport, messageId: 'library', data: { attribute: ALTERNATIVE } });
      },
    };
  },
};

export default { meta: { name: 'starter' }, rules: { 'drag-needs-alternative': rule } };
