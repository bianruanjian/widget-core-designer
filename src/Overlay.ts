import { WidgetBase } from '@dojo/widget-core/WidgetBase';
import { DimensionResults } from '@dojo/widget-core/meta/Dimensions';

import * as css from './styles/Overlay.m.css';
import { v } from '@dojo/widget-core/d';
import { VNode } from '@dojo/widget-core/interfaces';

export interface OverlayProperties {
	dimensions: DimensionResults;
}

// 注意，Overlay 只能放在原子部件上，不能放在容器部件上。
export default class Overlay extends WidgetBase<OverlayProperties> {
	protected render(): VNode {
		const { dimensions } = this.properties;
		return v(
			'div',
			{
				classes: css.root,
				style: `top: 0px; 
                left: 0px; 
                height: ${dimensions.size.height}px; 
                width: ${dimensions.size.width}px`
			},
			[]
		);
	}
}
