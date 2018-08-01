import { WidgetBase } from '@dojo/framework/widget-core/WidgetBase';
import { DimensionResults } from '@dojo/framework/widget-core/meta/Dimensions';

import * as css from './styles/Overlay.m.css';
import { v } from '@dojo/framework/widget-core/d';
import { VNode } from '@dojo/framework/widget-core/interfaces';

export interface OverlayProperties {
	dimensions: DimensionResults;
	onMouseUp: (event?: MouseEvent) => boolean | void;
}

// 注意，Overlay 只能放在原子部件上，不能放在容器部件上。
export default class Overlay extends WidgetBase<OverlayProperties> {
	protected render(): VNode {
		const { dimensions, onMouseUp } = this.properties;
		return v(
			'div',
			{
				classes: css.root,
				styles: {
					top: `${dimensions.offset.top}px`,
					left: `${dimensions.offset.left}px`,
					height: `${dimensions.size.height}px`,
					width: `${dimensions.size.width}px`
				},
				onmouseup: onMouseUp
			},
			[]
		);
	}
}
