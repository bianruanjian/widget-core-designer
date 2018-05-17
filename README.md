# brj-widget-core

[![npm version](https://badge.fury.io/js/widget-core-designer.svg)](https://badge.fury.io/js/widget-core-designer)


the base repository for widgets-designer

## 如何打包项目

进入项目文件夹，执行以下命令：

```bash
grunt dist
```

完成

## 如何开发设计器版部件

1. 创建对应的部件文件;
2. 引入本项目中的`DesignerWidgetMixin`：
    ```typescript
    import DesignerWidgetMixin from 'widget-core-designer/DesignerWidgetMixin';
    ```
3. 将原部件的属性与设计器部件的相关属性混合：
    ```typescript
    export default class View extends EditableMixin(ViewBase){}
    ```
4. 根据部件特性进行部分属性的定制：
    1. 复写`isContainer`方法，该方法默认返回 false，用于标识是否是容器部件，即内容为空时需要在设计器中默认撑开一定高度。
    2. 复写`needOverlay`方法，该方法默认返回 false，针对输入框之类的部件需要在设计器中阻止点击事件，增加遮盖层。
    ```typescript
        isContainer(){
            return false;
        }
        needOverlay(){
            return false;
        }
    ```
