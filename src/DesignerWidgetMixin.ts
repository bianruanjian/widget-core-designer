import { UIInstWidget } from "./interfaces";
import { Dimensions, DimensionResults } from '@dojo/widget-core/meta/Dimensions';
import { afterRender } from '@dojo/widget-core/decorators/afterRender';
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
export function DesignerWidgetMixin<T extends new (...args: any[]) => WidgetBase>(Base: T): T & Constructor<DesignerWidgetMixin> {
	abstract class Designable extends Base {
		public abstract properties: EditableWidgetProperties;
		

		private _key:string  ='';

		private _onMouseUp(event: MouseEvent) {
			event.stopImmediatePropagation();
			const { onFocus, widget } = this.properties;
			const dimensions = this.meta(Dimensions).get(this._key);
			onFocus && onFocus({ activeWidgetDimensions: dimensions, activeWidgetId: widget.id });
		}

		protected isContainer(): boolean {
			return false;
		}

		protected needOverlay(): boolean {
			return false;
		}

		@beforeProperties()
		protected beforeProperties(properties:any) {
			if (!properties.widget) {
				return { ...properties };
			}
			// 如果是空容器，则添加可视化效果
			if (this.isContainer() && this.children.length < 1) {
				return {
					extraClasses: { 'root': css.emptyContainer }, ...properties, ...properties.widget.properties
				}
			} 
			return {
				...properties, ...properties.widget.properties
			}
		}

		// 1. 尝试聚焦
		// 2. 绑定 onmouseup 事件
		// 3. input部件需要增加遮盖层节点
		@afterRender()
		protected afterRender(result: DNode | DNode[]): DNode | DNode[] {
			// 若为虚拟节点数组需要遍历所有节点，找到应用了key的节点，再添加onmouseup事件
			let key :string; 
			if (Array.isArray(result)) {
				result = result as DNode[];
				let node = find(result, (elm, index, array) => {
					return typeof (elm as VNode).properties.key !== undefined;
				});
				(node as VNode).properties.onmouseup = this._onMouseUp;
				key = String((node as VNode).properties.key);
			} else {
				(result as VNode).properties.onmouseup = this._onMouseUp;
				key = String((result as VNode).properties.key);
				result = [result];
			}
			this._key =key;

			const { widget, activeWidgetId, onFocus } = this.properties;
			this._tryFocus(widget, activeWidgetId, onFocus, key);
			if (this.needOverlay()) {
				return [...result, w(Overlay, { dimensions: this.meta(Dimensions).get(key) })]
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
			) => void,
			key: string
		) {
			if (this._isFocus(widget, activeWidgetId)) {
				this._focus(onFocus, activeWidgetId,key);
			}
		}

		private _focus(
			onFocus: (
				payload: {
					activeWidgetDimensions: Readonly<DimensionResults>;
					activeWidgetId: string | number;
				}
			) => void, activeWidgetId: string | number,key:string){
				const { widget } = this.properties;
				const dimensions = this.meta(Dimensions).get(key);
				this.meta(Resize).get(String(key),{});
				onFocus && onFocus({ activeWidgetDimensions: dimensions, activeWidgetId: widget.id });
		}

	};
	return Designable;
}
export default DesignerWidgetMixin;