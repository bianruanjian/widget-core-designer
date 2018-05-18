import { UIInstWidget } from "./interfaces";
import { Dimensions, DimensionResults } from '@dojo/widget-core/meta/Dimensions';
import { afterRender } from '@dojo/widget-core/decorators/afterRender';
import { beforeRender } from '@dojo/widget-core/decorators/beforeRender';
import { Constructor, DNode, VNode } from '@dojo/widget-core/interfaces';
import { WidgetBase } from '@dojo/widget-core/WidgetBase';
import { beforeProperties } from '@dojo/widget-core/decorators/beforeProperties';

import * as css from './styles/base.m.css';
import Overlay from './Overlay';
import { find } from '@dojo/shim/array';
import { w } from '@dojo/widget-core/d';
import { Resize } from "@dojo/widget-core/meta/Resize";
import { EditableWidgetProperties } from './interfaces'

export interface DesignerWidgetMixin {
	properties: EditableWidgetProperties;
}

// 将普通的用户自定义部件转换为可在设计器中使用的部件，提供以下扩展：
// 1. 测量部件尺寸
// 2. 增加遮盖层屏蔽部件中与设计器冲突的事件
// 3. 覆盖部件的获取焦点效果
// 4. 为空容器增加可视化效果
function DesignerWidgetMixin<T extends new (...args: any[]) => WidgetBase>(Base: T): T & Constructor<DesignerWidgetMixin> {
	abstract class Designable extends Base {
		public abstract properties: EditableWidgetProperties;

		private _dimensions: DimensionResults|undefined;

		private _onMouseUp(event: MouseEvent) {
			event.stopImmediatePropagation();
			const { onFocus, widget } = this.properties;
			const dimensions = this.meta(Dimensions).get(String(this.properties.key));
			onFocus && onFocus({ activeWidgetDimensions: dimensions, activeWidgetId: widget.id });
		}

		protected isContainer(): boolean {
			return false;
		}

		protected needOverlay(): boolean {
			return false;
		}

		private get dimensions() {
			if (this._dimensions) {
				return this._dimensions;
			}
			return this.meta(Dimensions).get(String(this.properties.key));
		}

		@beforeProperties()
		protected beforeProperties() {
			if (!this.properties.widget) {
				return { ...this.properties };
			}
			// 如果是空容器，则添加可视化效果
			if (this.isContainer() && this.children.length < 1) {
				return {
					extraClasses: { 'root': css.emptyContainer }, ...this.properties, ...this.properties.widget.properties
				}
			} 
			return {
				...this.properties, ...this.properties.widget.properties
			}
		}

		@beforeRender()
		protected beforeRender(){
			const { widget, activeWidgetId, onFocus } = this.properties;
			this._tryFocus(widget, activeWidgetId, onFocus);
		}

		// 1. 尝试聚焦
		// 2. 绑定 onmouseup 事件
		// 3. input部件需要增加遮盖层节点
		@afterRender()
		protected afterRender(result: DNode | DNode[]): DNode | DNode[] {
			const key = String(this.properties.key);
			// 若为虚拟节点数组需要遍历所有节点，找到应用了key的节点，再添加onmouseup事件
			if (Array.isArray(result)) {
				result = result as DNode[];
				let node = find(result, (elm, index, array) => {
					return (elm as VNode).properties.key === key;
				});
				(node as VNode).properties.onmouseup = this._onMouseUp;
			} else {
				(result as VNode).properties.onmouseup = this._onMouseUp;
				result = [result];
			}
			if (this.needOverlay()) {
				return [...result, w(Overlay, { dimensions: this.dimensions })]
			}
			return [...result];
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
			) => void
		) {
			if (this._isFocus(widget, activeWidgetId)) {
				this._focus(onFocus, activeWidgetId);
			}
		}

		private _focus(
			onFocus: (
				payload: {
					activeWidgetDimensions: Readonly<DimensionResults>;
					activeWidgetId: string | number;
				}
			) => void, activeWidgetId: string | number){
				const { widget } = this.properties;
				const dimensions = this.meta(Dimensions).get(String(this.properties.key));
				this._dimensions = dimensions;
				this.meta(Resize).get(String(this.properties.key),{});
				onFocus && onFocus({ activeWidgetDimensions: dimensions, activeWidgetId: widget.id });
		}

	};
	return Designable;
}
export default DesignerWidgetMixin;