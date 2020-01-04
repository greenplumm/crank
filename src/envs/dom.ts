import {MaybePromise} from "../pledge";
import {
	Context,
	Default,
	Element,
	Environment,
	Intrinsic,
	IntrinsicIterator,
	Props,
	Renderer,
	Root,
} from "../crank";

export function updateDOMProps(el: HTMLElement, props: Props): void {
	for (let [key, value] of Object.entries(props)) {
		if (key in el && (el as any)[key] !== value) {
			(el as any)[key] = value;
		} else {
			key = key.toLowerCase();
			if (value === true) {
				el.setAttribute(key, "");
			} else if (value === false || value == null) {
				el.removeAttribute(key);
			} else {
				el.setAttribute(key, value);
			}
		}
	}
}

// TODO: improve this algorithm
// https://stackoverflow.com/questions/59418120/what-is-the-most-efficient-way-to-update-the-childnodes-of-a-dom-node-with-an-ar
export function updateDOMChildren(
	el: HTMLElement,
	children: (Node | string)[] = [],
): void {
	if (el.childNodes.length === 0) {
		const fragment = document.createDocumentFragment();
		for (let child of children) {
			if (typeof child === "string") {
				child = document.createTextNode(child);
			}

			fragment.appendChild(child);
		}

		el.appendChild(fragment);
		return;
	}

	let oldChild = el.firstChild;
	for (const newChild of children) {
		if (oldChild === null) {
			el.appendChild(
				typeof newChild === "string"
					? document.createTextNode(newChild)
					: newChild,
			);
		} else if (typeof newChild === "string") {
			if (oldChild.nodeType === Node.TEXT_NODE) {
				if (oldChild.nodeValue !== newChild) {
					oldChild.nodeValue = newChild;
				}

				oldChild = oldChild.nextSibling;
			} else {
				el.insertBefore(document.createTextNode(newChild), oldChild);
			}
		} else if (oldChild !== newChild) {
			el.insertBefore(newChild, oldChild);
		} else {
			oldChild = oldChild.nextSibling;
		}
	}

	while (oldChild !== null) {
		const nextSibling = oldChild.nextSibling;
		el.removeChild(oldChild);
		oldChild = nextSibling;
	}
}

export const env: Environment<HTMLElement> = {
	[Default](tag: string): Intrinsic<HTMLElement> {
		return function* defaultDOM({
			children,
			...props
		}): IntrinsicIterator<HTMLElement> {
			const node = document.createElement(tag);
			while (true) {
				updateDOMProps(node, props);
				updateDOMChildren(node, children);
				({children, ...props} = yield node);
			}
		};
	},
	*[Root]({node, children}): IntrinsicIterator<HTMLElement> {
		try {
			while (true) {
				updateDOMChildren(node, children);
				({node, children} = yield node);
			}
		} finally {
			updateDOMChildren(node);
		}
	},
};

export class DOMRenderer extends Renderer<HTMLElement> {}

export const renderer = new DOMRenderer([env]);

export function render(
	elem: Element | null | undefined,
	node: HTMLElement,
): MaybePromise<Context | undefined> {
	return renderer.render(elem, node);
}
