import { NodeTypes, parse as parseHtml, type TemplateChildNode } from "@vue/compiler-dom";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  createSSRApp,
  defineComponent,
  h,
  type Component,
  type FunctionalComponent,
  type Slots,
  type VNode,
} from "vue";
import { parse } from "vue/compiler-sfc";
import { renderToString } from "vue/server-renderer";

// Renders the real template of a component with stubbed child components and template bindings
// that mirror its script setup

const loadTemplate = (file: string) => {
  const path = fileURLToPath(new URL(`../../../${file}`, import.meta.url));
  const template = parse(readFileSync(path, "utf8")).descriptor.template?.content;
  if (!template) throw new Error(`${file} has no template`);
  // The runtime template compiler does not accept TypeScript non-null assertions
  return template.replace(/(\w)!\./g, "$1.");
};

export const stub = (render: (props: Record<string, any>, slots: Slots) => VNode, props: string[] = []) => {
  const component: FunctionalComponent<Record<string, any>> = (componentProps, { slots }) =>
    render(componentProps, slots);
  component.props = props;
  component.inheritAttrs = false;
  return component;
};
export const slotStub = (tag: string, attrs: Record<string, string> = {}) =>
  stub((_, slots) => h(tag, attrs, slots.default?.()));
// A closed CommonHeightTransition is collapsed and transparent, so its content is not visible
export const heightTransitionStub = stub((props, slots) => h("div", props.opened ? slots.default?.() : []), ["opened"]);

// The text of rendered HTML as a reader sees it, parsed by Vue's HTML parser: comments and tags are left out and
// entities are decoded. A separator keeps the texts of different elements apart, e.g. a label and its badge.
// Markup errors are recovered from like in a browser, since some tests pass a part of the rendered HTML
export const toText = (html: string, separator = "") => {
  const texts: string[] = [];
  const collect = (nodes: TemplateChildNode[]) =>
    nodes.forEach((node) => {
      if (node.type === NodeTypes.TEXT) texts.push(node.content);
      else if (node.type === NodeTypes.ELEMENT) collect(node.children);
    });
  collect(parseHtml(html, { whitespace: "preserve", onError: () => undefined }).children);
  return texts.join(separator).replace(/\s+/g, " ").trim();
};

// Any Vue warning, for example about a binding that the template uses but the test does not provide, fails the render
export const renderTemplate = async <Props extends Record<string, unknown>>(
  file: string,
  props: Props,
  bindings: (props: Props) => Record<string, unknown>,
  stubs: Record<string, Component>
) => {
  const component = defineComponent({
    props: Object.keys(props),
    setup: (componentProps) => ({ props: componentProps, ...bindings(componentProps as Props) }),
    template: loadTemplate(file),
  });
  const app = createSSRApp(component, props);
  const warnings: string[] = [];
  app.config.warnHandler = (message) => warnings.push(message);
  Object.entries(stubs).forEach(([name, stubComponent]) => app.component(name, stubComponent));
  const html = await renderToString(app);
  if (warnings.length) throw new Error(`Vue warnings while rendering ${file}:\n${warnings.join("\n")}`);
  return {
    html,
    headline: toText(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? ""),
    text: toText(html),
  };
};
