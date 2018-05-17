import { UIInstWidget } from "./interfaces";
import { Dimensions, DimensionResults } from '@dojo/widget-core/meta/Dimensions';
import { afterRender } from '@dojo/widget-core/decorators/afterRender';
import { Constructor, DNode, WidgetProperties, VNode } from '@dojo/widget-core/interfaces';
import { WidgetBase } from '@dojo/widget-core/WidgetBase';
import { beforeProperties } from '@dojo/widget-core/decorators/beforeProperties';

import * as css from './styles/base.m.css';
import Overlay from './Overlay';
import { find } from '@dojo/shim/array';
import { w } from '@dojo/widget-core/d';
import { EditableWidgetProperties } from './interfaces'

export interface DesignerWidgetMixin {
	properties: EditableWidgetProperties;
}

function DesignerWidgetMixin<T extends new (...args: any[]) => WidgetBase>(Base: T): T & Constructor<DesignerWidgetMixin> {
	abstract class designer extends Base {
		public abstract properties: EditableWidgetProperties;

		public onMouseUp(event: MouseEvent) {
			event.stopImmediatePropagation();
			const { onFocus, widget } = this.properties;
			const dimensions = this.meta(Dimensions).get(String(this.properties.key));
			console.log(dimensions);
			onFocus && onFocus({ activeWidgetDimensions: dimensions, activeWidgetId: widget.id });
		}


		isContainer(): boolean {
			return false;
		}

		needOverlay(): boolean {
			return false;
		}


		@beforeProperties()
		protected beforeProp() {
			if (this.properties.widget) {
				if (this.isContainer()) {
					if (this.children.length > 0) {
						return {
							...this.properties, ...this.properties.widget.properties
						}
					}
					return {
						extraClasses: { 'root': css.emptyContainer }, ...this.properties, ...this.properties.widget.properties
					}
				} else {
					return {
						...this.properties, ...this.properties.widget.properties
					}
				}
			}
			return { ...this.properties };
		}

		//1. 尝试聚焦
		//2. 绑定 onmouseup 事件
		//3. input部件需要增加遮盖层节点
		@afterRender()
		protected runAfterRenders(result: DNode | DNode[]): DNode | DNode[] {
			const { widget, activeWidgetId, onFocus } = this.properties;
			this.tryFocus(widget, activeWidgetId, onFocus);

			const key = String(this.properties.key);
			if (Array.isArray(result)) {
				let node = find((result as DNode[]), (elm, index, array) => {
					return (elm as VNode).properties.key === key;
				});
				(node as VNode).properties.onmouseup = this.onMouseUp;
			} else {
				(result as VNode).properties.onmouseup = this.onMouseUp;
			}
			if (this.needOverlay()) {
				let dimensions = this.meta(Dimensions).get(String(key));
				console.log(dimensions);
				return [...result, w(Overlay, { dimensions: dimensions })]
			}
			return [...result];
		}

		private _isFocus(widget: UIInstWidget, activeWidgetId: string | number) {
			return widget.id === activeWidgetId;
		}

		protected tryFocus(
			widget: UIInstWidget,
			activeWidgetId: string | number,
			onFocus: (
				payload: {
					activeWidgetDimensions: Readonly<DimensionResults>;
					activeWidgetId: string | number;
					reRenderOperatePane: boolean // 是否重绘操作面板
				}
			) => void
		) {
			if (this._isFocus(widget, activeWidgetId)) {
				const { onFocus, widget } = this.properties;
				const dimensions = this.meta(Dimensions).get(String(this.properties.key));
				console.log(dimensions);
				onFocus && onFocus({ activeWidgetDimensions: dimensions, activeWidgetId: widget.id });
			}
		}

	};
	return designer;
}
export default DesignerWidgetMixin;