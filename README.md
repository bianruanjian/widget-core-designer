# widget-core-designer

[![npm version](https://badge.fury.io/js/widget-core-designer.svg)](https://badge.fury.io/js/widget-core-designer)


将用户自定义部件转换为可在设计器中使用的部件，提供以下功能：

1. 测量部件尺寸;
2. 增加遮盖层，屏蔽部件与设计器冲突的事件;
3. 覆盖部件的获取焦点效果;
4. 为空容器增加可视化效果等。

## 如何使用

在你的项目中使用`widget-core-designer`时，需使用以下命令安装此包

```bash
npm install widget-core-designer
```

## 如何开发设计器版部件

### 开发步骤

1. 创建部件类，为用户自定义部件添加设计器功能;
2. 引入本项目中的`DesignerWidgetMixin`：
    ```typescript
    import DesignerWidgetMixin from 'widget-core-designer/DesignerWidgetMixin';
    ```
3. 将原部件的属性与设计器部件的相关属性混合：
    ```typescript
    export default class UserCustomWidget extends DesignerWidgetMixin(UserCustomWidgetBase){}
    ```
4. 根据部件特性进行部分属性的定制：
    1. 覆写`isContainer`方法，该方法默认返回`false`，用于标识是否是容器部件，即内容为空时需要在设计器中默认撑开一定高度。
    2. 覆写`needOverlay`方法，该方法默认返回`false`，针对输入框之类的部件需要在设计器中阻止点击事件，增加遮盖层。
    ```typescript
    protected isContainer(){
        return false;
    }
    protected needOverlay(){
        return false;
    }
    ```

### 示例代码

1. 自定义部件

```typescript

export class UserCustomWidgetBase<P extends UserCustomWidgetProperties = UserCustomWidgetProperties> extends ThemedBase<P> {
    ...
}

export default class UserCustomWidget extends UserCustomWidgetBase<UserCustomWidgetProperties> {}

```

2. 设计器使用的部件

```typescript
import UserCustomWidgetBase from './widgets/UserCustomWidget';
import DesignerWidgetMixin from './DesignerWidgetMixin';

export class UserCustomWidget extends DesignerWidgetMixin(UserCustomWidgetBase){
    
    protected isContainer(){
       return true;
    }

    protected needOverlay(){
        return false;
    }
}

export default UserCustomWidget;
```

## 如何打包项目

进入项目的根目录，执行以下命令：

```bash
grunt dist
```