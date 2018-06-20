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

		private _prepend: string = '__prepend__';

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
			// 1. 不包含子节点且isContainer返回true的部件
			// 2. isContainer 返回 true 子节点中只有游标或者内置的prepend节点
			if (this.isContainer() && (this.children.length === 0 || this._onlyContainsCursorOrPrepend())) {
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

		private _onlyContainsCursorOrPrepend() {
			if (this.children.length > 2) {
				return false;
			}
			const cursorProperties = (this.children[0]! as VNode).properties.widget;
			if (cursorProperties.widgetName === 'Cursor') {
				if (this.children.length === 1) {
					return true;
				}
				const prependProperties = (this.children[1]! as VNode).properties;
				if (prependProperties.key === this._prepend) {
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
				if (!this._havePrepend()) {
					// 防止渲染多个 prepend 造成key重复报错
					this.children.push(
						v('div', (inserted: boolean) => {
							this._tryFocus(widget, activeWidgetId, onFocus, key);
							return { key: this._prepend }; // 系统内置的节点前后均在前后加两个`_`以做区分
						})
					);
				}
			}
		}

		private _havePrepend() {
			if (this.children) {
				this.children.forEach((child) => {
					if ((child as VNode).properties.key && (child as VNode).properties.key === this._prepend) {
						return true;
					}
				});
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
