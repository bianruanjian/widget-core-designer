import { UIInstWidget } from './interfaces';
import { Dimensions, DimensionResults } from '@dojo/widget-core/meta/Dimensions';
import { afterRender } from '@dojo/widget-core/decorators/afterRender';
import { Constructor, DNode, VNode } from '@dojo/widget-core/interfaces';
import { WidgetBase } from '@dojo/widget-core/WidgetBase';
import { beforeProperties } from '@dojo/widget-core/decorators/beforeProperties';
import * as css from './styles/base.m.css';
import Overlay from './Overlay';
import { find } from '@dojo/shim/array';
import { v, w } from '@dojo/widget-core/d';
import { Resize } from '@dojo/widget-core/meta/Resize';
import { EditableWidgetProperties } from './interfaces';

export interface DesignerWidgetMixin {
	properties: EditableWidgetProperties;
}

// 将普通的用户自定义部件转换为可在设计器中使用的部件，提供以下扩展：
// 1. 测量部件尺寸
// 2. 增加遮盖层屏蔽部件中与设计器冲突的事件
// 3. 覆盖部件的获取焦点效果
// 4. 为空容器增加可视化效果
export function DesignerWidgetMixin<T extends new (...args: any[]) => WidgetBase>(
	Base: T
): T & Constructor<DesignerWidgetMixin> {
	abstract class Designable extends Base {
		public abstract properties: EditableWidgetProperties;

		private _key: string = '';

		/**
		 * 问题描述
		 * 部件聚焦时，当通过修改属性值调整聚焦部件的位置且不会触发 Resize Observer 时，
		 * 如调整 Float 的值，则需要一种方法来触发聚焦部件的重绘方法以获取正确的位置信息（用于重绘聚焦框）。
		 *
		 * 注意，Resize Observer 只有在改变了 DOM 节点的 content rect size 时才会触发，而如果将 float 的值从 left 改为 right 时，
		 * DOM 节点的位置发生了变化，而 rect size 并没有发生变化，
		 * 所以没有触发 Resize Observer，参见 https://wicg.github.io/ResizeObserver/#content-rect。
		 *
		 * 解决方法
		 *
		 * 在聚焦部件里添加一个子节点，然后在子部件上传入 deferred properties 来延迟触发 tryFocus 方法，
		 * 即每次绘制完聚焦部件后，都会调用 tryFocus 方法，从而获取到正确的位置信息，实现聚焦框的准确定位。
		 */
		private _triggerResizeWidgetKey: string = '__triggerResize__'; // 如果是系统内使用的字符串，则在字符串的前后分别增加两个 '_'

		private _onMouseUp(event?: MouseEvent) {
			if (event) {
				event.stopImmediatePropagation();
				const { onFocus, widget } = this.properties;
				const dimensions = this.meta(Dimensions).get(this._key);
				onFocus && onFocus({ activeWidgetDimensions: dimensions, activeWidgetId: widget.id });
			}
		}

		protected isContainer(): boolean {
			return false;
		}

		protected needOverlay(): boolean {
			return false;
		}

		@beforeProperties()
		protected beforeProperties(properties: any) {
			if (!properties.widget) {
				return { ...properties };
			}
			// 如果是空容器，则添加可视化效果
			// 当前判断为空容器的条件有:
			// 1. 不包含子节点且 isContainer 返回 true 的部件
			// 2. isContainer 返回 true 子节点中只有游标或者内置的触发 tryFocus 方法的部件
			if (this.isContainer() && (this.children.length === 0 || this._onlyContainsCursorOrTriggerResizeWidget())) {
				return {
					extraClasses: { root: css.emptyContainer },
					...properties,
					...properties.widget.properties
				};
			}
			return {
				...properties,
				...properties.widget.properties
			};
		}

		/**
		 * 一个空容器中最多会包含两个在设计器中使用的特殊部件，
		 * 一个是用于显示光标(Cursor)的部件，一个用于延迟触发 tryFocus 方法的部件，
		 * 这两个不是用户添加的部件，所以要过滤出来。
		 * 一个空容器中有以上两个部件时，约定：
		 * 1. 光标作为第一个节点；
		 * 2. 延迟触发 tryFocus 方法的部件作为最后一个节点。
		 */
		private _onlyContainsCursorOrTriggerResizeWidget() {
			if (this.children.length > 2) {
				return false;
			}
			const cursorProperties = (this.children[0]! as VNode).properties.widget;
			if (cursorProperties.widgetName === 'Cursor') {
				if (this.children.length === 1) {
					return true;
				}
				const triggerResizeWidgetProperties = (this.children[1]! as VNode).properties;
				if (triggerResizeWidgetProperties.key === this._triggerResizeWidgetKey) {
					return true;
				}
			}
			return false;
		}

		// 1. 尝试聚焦
		// 2. 绑定 onmouseup 事件
		// 3. input部件需要增加遮盖层节点
		@afterRender()
		protected afterRender(result: DNode | DNode[]): DNode | DNode[] {
			// 若为虚拟节点数组需要遍历所有节点，找到应用了key的节点，再添加onmouseup事件
			let key: string;
			let widgetNode: VNode;
			if (Array.isArray(result)) {
				result = result as DNode[];
				let node = find(result, (elm, index, array) => {
					return elm !== null && (elm as VNode).properties.key !== undefined;
				});
				widgetNode = node as VNode;
				key = String(widgetNode.properties.key);
			} else {
				widgetNode = result as VNode;
				key = String(widgetNode.properties.key);
				result = [result];
			}
			this._key = key;
			if (this.needOverlay()) {
				// 遮盖层覆盖住了部件节点，需要将 onMouseUp 事件传给遮盖层
				return [
					...result,
					w(Overlay, { dimensions: this.meta(Dimensions).get(key), onMouseUp: this._onMouseUp })
				];
			} else {
				// 没有遮盖层时需要绑定 onMouseUp 事件到部件节点上
				widgetNode.properties.onmouseup = this._onMouseUp;
			}
			this._resize(key);
			return [...result];
		}

		private _resize(key: string) {
			const { widget, activeWidgetId, onFocus } = this.properties;
			if (this._isFocus(widget, activeWidgetId)) {
				if (!this._hasResized()) {
					// 防止渲染多个 triggerResizeWidget 造成 key 重复报错
					this.children.push(
						v('div', (inserted: boolean) => {
							this._tryFocus(widget, activeWidgetId, onFocus, key);
							return { key: this._triggerResizeWidgetKey };
						})
					);
				}
			}
		}

		private _hasResized() {
			if (this.children) {
				const node = find(this.children, (child) => {
					return (
						(child as VNode).properties.key !== undefined &&
						(child as VNode).properties.key === this._triggerResizeWidgetKey
					);
				});
				if (node) {
					return true;
				}
			}
			return false;
		}

		private _isFocus(widget: UIInstWidget, activeWidgetId: string | number) {
			return widget.id === activeWidgetId;
		}

		private _tryFocus(
			widget: UIInstWidget,
			activeWidgetId: string | number,
			onFocus: (
				payload: {
					activeWidgetDimensions: Readonly<DimensionResults>;
					activeWidgetId: string | number;
				}
			) => void,
			key: string
		) {
			if (this._isFocus(widget, activeWidgetId)) {
				this._focus(onFocus, activeWidgetId, key);
			}
		}

		private _focus(
			onFocus: (
				payload: {
					activeWidgetDimensions: Readonly<DimensionResults>;
					activeWidgetId: string | number;
				}
			) => void,
			activeWidgetId: string | number,
			key: string
		) {
			const { widget } = this.properties;
			const dimensions = this.meta(Dimensions).get(key);
			this.meta(Resize).get(String(key), {});
			onFocus && onFocus({ activeWidgetDimensions: dimensions, activeWidgetId: widget.id });
		}
	}
	return Designable;
}
export default DesignerWidgetMixin;
