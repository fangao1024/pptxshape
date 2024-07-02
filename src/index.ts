/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-unused-vars */
// EMU单位
export const EMU = 914400;
// dpi
export const dpi = 96;
// PPT单位换算
export const PPT_FACTORY = dpi / EMU;

export interface ShapePoolItem {
    viewBox: [number, number];
    path: string;
    special?: boolean;
    outlined?: boolean;
    pptxShapeType?: PresetShapeType;
    title?: string;
}

export function val(value: number) {
    return value * PPT_FACTORY;
}

export function unval(value: number) {
    return value / PPT_FACTORY;
}

class Point {
    public X: number;

    public Y: number;

    constructor(x: number, y: number) {
        this.X = x;
        this.Y = y;
    }
}

function getEllipsePoint(a: number, b: number, theta: number): Point {
    const aSinTheta = a * Math.sin(theta);
    const bCosTheta = b * Math.cos(theta);
    const circleRadius = Math.sqrt(aSinTheta * aSinTheta + bCosTheta * bCosTheta);
    // 判断是否为0
    if (circleRadius === 0) {
        return new Point(0, 0);
    }
    return new Point((a * bCosTheta) / circleRadius, (b * aSinTheta) / circleRadius);
}

// 当前点 key
export const currentPointKey = 'CURRENT_POINT';

export const movePointKey = 'MOVE_POINT';

export function moveTo(context: Record<string, any>, x: number, y: number) {
    // 修改当前点
    context[currentPointKey] = new Point(x, y);
    // 开始点
    context[movePointKey] = new Point(x, y);
    x = context.GET_X(x);
    y = context.GET_Y(y);
    return `M ${x} ${y}`;
}

export function lineTo(context: Record<string, any>, x: number, y: number) {
    // 修改当前点
    context[currentPointKey] = new Point(x, y);
    x = context.GET_X(x);
    y = context.GET_Y(y);
    return `L ${x} ${y}`;
}

export function cubicBezTo(
    context: Record<string, any>,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number
) {
    // 修改当前点
    context[currentPointKey] = new Point(x3, y3);
    x1 = context.GET_X(x1);
    y1 = context.GET_Y(y1);
    x2 = context.GET_X(x2);
    y2 = context.GET_Y(y2);
    x3 = context.GET_X(x3);
    y3 = context.GET_Y(y3);
    return `C ${x1} ${y1} ${x2} ${y2} ${x3} ${y3}`;
}

export function arcTo(
    context: Record<string, any>,
    wR: number,
    hR: number,
    stAng: number,
    swAng: number
) {
    // 当前点
    const currentPoint = context[currentPointKey] as Point;
    // 转换弧度
    stAng = Formula.angle(stAng);
    swAng = Formula.angle(swAng);

    //修复当椭圆弧线进行360°时，起始点和终点一样，会导致弧线变成点，因此-1°才进行计算
    if (Math.abs(swAng) === 2 * Math.PI) {
        swAng = swAng - swAng / 360;
    }

    const p1 = getEllipsePoint(wR, hR, stAng);
    const p2 = getEllipsePoint(wR, hR, stAng + swAng);

    // 结束点
    const endPoint = new Point(currentPoint.X - p1.X + p2.X, currentPoint.Y - p1.Y + p2.Y);
    // 修改当前点
    context[currentPointKey] = endPoint;
    // 半径
    const rx = context.GET_X(wR);
    const ry = context.GET_Y(hR);
    // 旋转角度
    const rotation = 0;
    // 计算大弧标志和扫描标志
    const largeArcFlag = Math.abs(swAng) > Math.PI ? 1 : 0;
    const sweepFlag = swAng > 0 ? 1 : 0;
    // 终点位置
    const x = context.GET_X(endPoint.X);
    const y = context.GET_Y(endPoint.Y);

    return `A ${rx} ${ry} ${rotation} ${largeArcFlag} ${sweepFlag} ${x} ${y}`;
}

export function quadBezTo(
    context: Record<string, any>,
    x1: number,
    y1: number,
    x2: number,
    y2: number
) {
    // 修改当前点
    context[currentPointKey] = new Point(x2, y2);
    x1 = context.GET_X(x1);
    y1 = context.GET_Y(y1);
    x2 = context.GET_X(x2);
    y2 = context.GET_Y(y2);
    return `Q ${x1} ${y1} ${x2} ${y2}`;
}

export function close(context: Record<string, any>) {
    // 修改当前点
    context[currentPointKey] = context[movePointKey];
    return 'Z';
}

export function path(
    context: Record<string, any>,
    attrs: Record<string, any>,
    callback: () => string
): string {
    // 初始化当前点
    context[currentPointKey] = new Point(0, 0);
    context[movePointKey] = undefined;
    if (attrs.h || attrs.w) {
        context.SLICE = [context.REAL_WIDTH / attrs.w, context.REAL_HEIGHT / attrs.h];
    } else {
        context.SLICE = [0, 0];
    }

    return callback();
}

class Formula {
    // [Office Open XML 的测量单位](https://blog.lindexi.com/post/Office-Open-XML-%E7%9A%84%E6%B5%8B%E9%87%8F%E5%8D%95%E4%BD%8D.html )
    public static angleVal = 60000;

    public static '+-'(a: number, b: number, c: number, ...args: number[]) {
        return a + b - c;
    }

    public static '*/'(a: number, b: number, c: number, ...args: number[]) {
        return (a * b) / c;
    }

    public static '+/'(a: number, b: number, c: number, ...args: number[]) {
        return (a + b) / c;
    }

    public static '?:'(a: number, b: number, c: number, ...args: number[]) {
        return a > 0 ? b : c;
    }

    public static abs(value: number) {
        return Math.abs(value);
    }

    public static pin(x: number, y: number, z: number) {
        if (y < x) {
            return x;
        } else if (y > z) {
            return z;
        } else {
            return y;
        }
    }

    public static val(value: number) {
        return value;
    }

    public static min(a: number, b: number) {
        return Math.min(a, b);
    }

    public static max(a: number, b: number) {
        return Math.max(a, b);
    }

    public static sqrt(value: number) {
        return Math.sqrt(value);
    }

    public static mod(x: number, y: number, z: number) {
        return Math.sqrt(x * x + y * y + z * z);
    }

    public static angle(value: number) {
        const degree = value / Formula.angleVal;
        const angle = (degree * Math.PI) / 180;
        return angle;
    }

    public static cos(x: number, y: number) {
        return x * Math.cos(Formula.angle(y));
    }

    public static sin(x: number, y: number) {
        return x * Math.sin(Formula.angle(y));
    }

    public static tan(x: number, y: number) {
        return x * Math.tan(Formula.angle(y));
    }

    public static at2(x: number, y: number) {
        const radians = Math.atan2(y, x);
        const angle = (radians * 180) / Math.PI;
        return angle * Formula.angleVal;
    }

    public static cat2(x: number, y: number, z: number) {
        return x * Math.cos(Math.atan2(z, y));
    }

    public static sat2(x: number, y: number, z: number) {
        return x * Math.sin(Math.atan2(z, y));
    }
}
// 生成上下文
export function getContext(width: number, height: number) {
    const context: Record<string, any> = {
        REAL_WIDTH: width,
        REAL_HEIGHT: height,
        SCALE: [0, 0],
        GET_X(v: number) {
            if (this.SLICE[0]) {
                return v * this.SLICE[0];
            }
            return val(v);
        },
        GET_Y(v: number) {
            if (this.SLICE[1]) {
                return v * this.SLICE[1];
            }
            return val(v);
        },
        w: unval(width),
        h: unval(height),
        get wd2() {
            return this.w / 2;
        },
        get wd3() {
            return this.w / 3;
        },
        get wd4() {
            return this.w / 4;
        },
        get wd5() {
            return this.w / 5;
        },
        get wd6() {
            return this.w / 6;
        },
        get wd8() {
            return this.w / 8;
        },
        get wd10() {
            return this.w / 10;
        },
        get wd32() {
            return this.w / 32;
        },
        get hd2() {
            return this.h / 2;
        },
        get hd3() {
            return this.h / 3;
        },
        get hd4() {
            return this.h / 4;
        },
        get hd5() {
            return this.h / 5;
        },
        get hd6() {
            return this.h / 6;
        },
        get hd8() {
            return this.h / 8;
        },
        get hd10() {
            return this.h / 10;
        },
        get vc() {
            return this.h / 2;
        },
        get hc() {
            return this.w / 2;
        },
        get t() {
            return 0;
        },
        get b() {
            return this.h;
        },
        get l() {
            return 0;
        },
        get r() {
            return this.w;
        },
        get ls() {
            return Math.max(this.w, this.h);
        },
        get ss() {
            return Math.min(this.w, this.h);
        },
        get ssd2() {
            return Math.min(this.w, this.h) / 2;
        },
        get ssd4() {
            return Math.min(this.w, this.h) / 4;
        },
        get ssd6() {
            return Math.min(this.w, this.h) / 6;
        },
        get ssd8() {
            return Math.min(this.w, this.h) / 8;
        },
        get ssd16() {
            return Math.min(this.w, this.h) / 16;
        },
        get ssd32() {
            return Math.min(this.w, this.h) / 32;
        },
        get cd2() {
            return 10800000;
        },
        get cd4() {
            return 5400000;
        },
        get cd8() {
            return 2700000;
        },
        get '3cd4'() {
            return 16200000;
        },
        get '3cd8'() {
            return 8100000;
        },
        get '3cd16'() {
            return 4050000;
        },
        get '5cd8'() {
            return 13500000;
        },
        get '7cd8'() {
            return 18900000;
        },
    };
    return new Proxy<Record<string, any>>(context, {
        get(target, prop) {
            if (!Number.isNaN(Number(prop))) {
                return Number(prop);
            }
            return Reflect.get(target, prop);
        },
        set(target, prop, value) {
            return Reflect.set(target, prop, value);
        },
    });
}

// pptx 预设形状类型
export enum PresetShapeType {
    ACCENT_BORDER_CALLOUT1 = 'accentBorderCallout1',
    ACCENT_BORDER_CALLOUT2 = 'accentBorderCallout2',
    ACCENT_BORDER_CALLOUT3 = 'accentBorderCallout3',
    ACCENT_CALLOUT1 = 'accentCallout1',
    ACCENT_CALLOUT2 = 'accentCallout2',
    ACCENT_CALLOUT3 = 'accentCallout3',
    ACTION_BUTTON_BACK_PREVIOUS = 'actionButtonBackPrevious',
    ACTION_BUTTON_BEGINNING = 'actionButtonBeginning',
    ACTION_BUTTON_BLANK = 'actionButtonBlank',
    ACTION_BUTTON_DOCUMENT = 'actionButtonDocument',
    ACTION_BUTTON_END = 'actionButtonEnd',
    ACTION_BUTTON_FORWARD_NEXT = 'actionButtonForwardNext',
    ACTION_BUTTON_HELP = 'actionButtonHelp',
    ACTION_BUTTON_HOME = 'actionButtonHome',
    ACTION_BUTTON_INFORMATION = 'actionButtonInformation',
    ACTION_BUTTON_MOVIE = 'actionButtonMovie',
    ACTION_BUTTON_RETURN = 'actionButtonReturn',
    ACTION_BUTTON_SOUND = 'actionButtonSound',
    ARC = 'arc',
    BENT_ARROW = 'bentArrow',
    BENT_CONNECTOR2 = 'bentConnector2',
    BENT_CONNECTOR3 = 'bentConnector3',
    BENT_CONNECTOR4 = 'bentConnector4',
    BENT_CONNECTOR5 = 'bentConnector5',
    BENT_UP_ARROW = 'bentUpArrow',
    BEVEL = 'bevel',
    BLOCK_ARC = 'blockArc',
    BORDER_CALLOUT1 = 'borderCallout1',
    BORDER_CALLOUT2 = 'borderCallout2',
    BORDER_CALLOUT3 = 'borderCallout3',
    BRACE_PAIR = 'bracePair',
    BRACKET_PAIR = 'bracketPair',
    CALLOUT1 = 'callout1',
    CALLOUT2 = 'callout2',
    CALLOUT3 = 'callout3',
    CAN = 'can',
    CHART_PLUS = 'chartPlus',
    CHART_STAR = 'chartStar',
    CHART_X = 'chartX',
    CHEVRON = 'chevron',
    CHORD = 'chord',
    CIRCULAR_ARROW = 'circularArrow',
    CLOUD = 'cloud',
    CLOUD_CALLOUT = 'cloudCallout',
    CORNER = 'corner',
    CORNER_TABS = 'cornerTabs',
    CUBE = 'cube',
    CURVED_CONNECTOR2 = 'curvedConnector2',
    CURVED_CONNECTOR3 = 'curvedConnector3',
    CURVED_CONNECTOR4 = 'curvedConnector4',
    CURVED_CONNECTOR5 = 'curvedConnector5',
    CURVED_DOWN_ARROW = 'curvedDownArrow',
    CURVED_LEFT_ARROW = 'curvedLeftArrow',
    CURVED_RIGHT_ARROW = 'curvedRightArrow',
    CURVED_UP_ARROW = 'curvedUpArrow',
    DECAGON = 'decagon',
    DIAG_STRIPE = 'diagStripe',
    DIAMOND = 'diamond',
    DODECAGON = 'dodecagon',
    DONUT = 'donut',
    DOUBLE_WAVE = 'doubleWave',
    DOWN_ARROW = 'downArrow',
    DOWN_ARROW_CALLOUT = 'downArrowCallout',
    ELLIPSE = 'ellipse',
    ELLIPSE_RIBBON = 'ellipseRibbon',
    ELLIPSE_RIBBON2 = 'ellipseRibbon2',
    FLOW_CHART_ALTERNATE_PROCESS = 'flowChartAlternateProcess',
    FLOW_CHART_COLLATE = 'flowChartCollate',
    FLOW_CHART_CONNECTOR = 'flowChartConnector',
    FLOW_CHART_DECISION = 'flowChartDecision',
    FLOW_CHART_DELAY = 'flowChartDelay',
    FLOW_CHART_DISPLAY = 'flowChartDisplay',
    FLOW_CHART_DOCUMENT = 'flowChartDocument',
    FLOW_CHART_EXTRACT = 'flowChartExtract',
    FLOW_CHART_INPUT_OUTPUT = 'flowChartInputOutput',
    FLOW_CHART_INTERNAL_STORAGE = 'flowChartInternalStorage',
    FLOW_CHART_MAGNETIC_DISK = 'flowChartMagneticDisk',
    FLOW_CHART_MAGNETIC_DRUM = 'flowChartMagneticDrum',
    FLOW_CHART_MAGNETIC_TAPE = 'flowChartMagneticTape',
    FLOW_CHART_MANUAL_INPUT = 'flowChartManualInput',
    FLOW_CHART_MANUAL_OPERATION = 'flowChartManualOperation',
    FLOW_CHART_MERGE = 'flowChartMerge',
    FLOW_CHART_MULTIDOCUMENT = 'flowChartMultidocument',
    FLOW_CHART_OFFLINE_STORAGE = 'flowChartOfflineStorage',
    FLOW_CHART_OFFPAGE_CONNECTOR = 'flowChartOffpageConnector',
    FLOW_CHART_ONLINE_STORAGE = 'flowChartOnlineStorage',
    FLOW_CHART_OR = 'flowChartOr',
    FLOW_CHART_PREDEFINED_PROCESS = 'flowChartPredefinedProcess',
    FLOW_CHART_PREPARATION = 'flowChartPreparation',
    FLOW_CHART_PROCESS = 'flowChartProcess',
    FLOW_CHART_PUNCHED_CARD = 'flowChartPunchedCard',
    FLOW_CHART_PUNCHED_TAPE = 'flowChartPunchedTape',
    FLOW_CHART_SORT = 'flowChartSort',
    FLOW_CHART_SUMMING_JUNCTION = 'flowChartSummingJunction',
    FLOW_CHART_TERMINATOR = 'flowChartTerminator',
    FOLDED_CORNER = 'foldedCorner',
    FRAME = 'frame',
    FUNNEL = 'funnel',
    GEAR6 = 'gear6',
    GEAR9 = 'gear9',
    HALF_FRAME = 'halfFrame',
    HEART = 'heart',
    HEPTAGON = 'heptagon',
    HEXAGON = 'hexagon',
    HOME_PLATE = 'homePlate',
    HORIZONTAL_SCROLL = 'horizontalScroll',
    IRREGULAR_SEAL1 = 'irregularSeal1',
    IRREGULAR_SEAL2 = 'irregularSeal2',
    LEFT_ARROW = 'leftArrow',
    LEFT_ARROW_CALLOUT = 'leftArrowCallout',
    LEFT_BRACE = 'leftBrace',
    LEFT_BRACKET = 'leftBracket',
    LEFT_CIRCULAR_ARROW = 'leftCircularArrow',
    LEFT_RIGHT_ARROW = 'leftRightArrow',
    LEFT_RIGHT_ARROW_CALLOUT = 'leftRightArrowCallout',
    LEFT_RIGHT_CIRCULAR_ARROW = 'leftRightCircularArrow',
    LEFT_RIGHT_RIBBON = 'leftRightRibbon',
    LEFT_RIGHT_UP_ARROW = 'leftRightUpArrow',
    LEFT_UP_ARROW = 'leftUpArrow',
    LIGHTNING_BOLT = 'lightningBolt',
    LINE = 'line',
    LINE_INV = 'lineInv',
    MATH_DIVIDE = 'mathDivide',
    MATH_EQUAL = 'mathEqual',
    MATH_MINUS = 'mathMinus',
    MATH_MULTIPLY = 'mathMultiply',
    MATH_NOT_EQUAL = 'mathNotEqual',
    MATH_PLUS = 'mathPlus',
    MOON = 'moon',
    NON_ISOSCELES_TRAPEZOID = 'nonIsoscelesTrapezoid',
    NO_SMOKING = 'noSmoking',
    NOTCHED_RIGHT_ARROW = 'notchedRightArrow',
    OCTAGON = 'octagon',
    PARALLELOGRAM = 'parallelogram',
    PENTAGON = 'pentagon',
    PIE = 'pie',
    PIE_WEDGE = 'pieWedge',
    PLAQUE = 'plaque',
    PLAQUE_TABS = 'plaqueTabs',
    PLUS = 'plus',
    QUAD_ARROW = 'quadArrow',
    QUAD_ARROW_CALLOUT = 'quadArrowCallout',
    RECT = 'rect',
    RIBBON = 'ribbon',
    RIBBON2 = 'ribbon2',
    RIGHT_ARROW = 'rightArrow',
    RIGHT_ARROW_CALLOUT = 'rightArrowCallout',
    RIGHT_BRACE = 'rightBrace',
    RIGHT_BRACKET = 'rightBracket',
    ROUND1_RECT = 'round1Rect',
    ROUND2_DIAG_RECT = 'round2DiagRect',
    ROUND2_SAME_RECT = 'round2SameRect',
    ROUND_RECT = 'roundRect',
    RT_TRIANGLE = 'rtTriangle',
    SMILEY_FACE = 'smileyFace',
    SNIP1_RECT = 'snip1Rect',
    SNIP2_DIAG_RECT = 'snip2DiagRect',
    SNIP2_SAME_RECT = 'snip2SameRect',
    SNIP_ROUND_RECT = 'snipRoundRect',
    SQUARE_TABS = 'squareTabs',
    STAR10 = 'star10',
    STAR12 = 'star12',
    STAR16 = 'star16',
    STAR24 = 'star24',
    STAR32 = 'star32',
    STAR4 = 'star4',
    STAR5 = 'star5',
    STAR6 = 'star6',
    STAR7 = 'star7',
    STAR8 = 'star8',
    STRAIGHT_CONNECTOR1 = 'straightConnector1',
    STRIPED_RIGHT_ARROW = 'stripedRightArrow',
    SUN = 'sun',
    SWOOSH_ARROW = 'swooshArrow',
    TEARDROP = 'teardrop',
    TRAPEZOID = 'trapezoid',
    TRIANGLE = 'triangle',
    UP_ARROW_CALLOUT = 'upArrowCallout',
    UP_DOWN_ARROW = 'upDownArrow',
    UP_ARROW = 'upArrow',
    UP_DOWN_ARROW_CALLOUT = 'upDownArrowCallout',
    UTURN_ARROW = 'uturnArrow',
    VERTICAL_SCROLL = 'verticalScroll',
    WAVE = 'wave',
    WEDGE_ELLIPSE_CALLOUT = 'wedgeEllipseCallout',
    WEDGE_RECT_CALLOUT = 'wedgeRectCallout',
    WEDGE_ROUND_RECT_CALLOUT = 'wedgeRoundRectCallout',
}
export type PathItemAttrsKey = 'fill' | 'stroke' | 'extrusionOk' | 'w' | 'h';
export interface PathItem {
    d: string;
    attrs: Partial<Record<PathItemAttrsKey, string | number>>;
    context: Record<string, any>;
}

export interface ShapePathFormulaValue {
    editable: boolean;
    defaultValue?: number[];
    defaultKey?: string[];
    range?: [number, number] | ((width: number, height: number) => [number, number]);
    formula: (width: number, height: number, value: number[]) => PathItem[];
}
export const SHAPE_PATH_FORMULAS: Record<PresetShapeType, ShapePathFormulaValue> = {
    [PresetShapeType.ACCENT_BORDER_CALLOUT1]: {
        editable: true,
        defaultValue: [18750, -8333, 112500, -38333],
        defaultKey: ['adj1', 'adj2', 'adj3', 'adj4'],
        formula: (width: number, height: number, [adj1, adj2, adj3, adj4]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;
            context['adj3'] = adj3;
            context['adj4'] = adj4;

            context['y1'] = Formula['*/'](context['h'], context['adj1'], context['100000']);
            context['x1'] = Formula['*/'](context['w'], context['adj2'], context['100000']);
            context['y2'] = Formula['*/'](context['h'], context['adj3'], context['100000']);
            context['x2'] = Formula['*/'](context['w'], context['adj4'], context['100000']);

            return [
                {
                    d: path(context, { extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['b'])} ${lineTo(
                            context,
                            context['l'],
                            context['b']
                        )} ${close(context)}`;
                    }),
                    attrs: { extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['x1'], context['t'])} ${close(
                            context
                        )} ${lineTo(context, context['x1'], context['b'])}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['x1'], context['y1'])} ${lineTo(
                            context,
                            context['x2'],
                            context['y2']
                        )}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.ACCENT_BORDER_CALLOUT2]: {
        editable: true,
        defaultValue: [18750, -8333, 18750, -16667, 112500, -46667],
        defaultKey: ['adj1', 'adj2', 'adj3', 'adj4', 'adj5', 'adj6'],
        formula: (
            width: number,
            height: number,
            [adj1, adj2, adj3, adj4, adj5, adj6]: number[]
        ) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;
            context['adj3'] = adj3;
            context['adj4'] = adj4;
            context['adj5'] = adj5;
            context['adj6'] = adj6;

            context['y1'] = Formula['*/'](context['h'], context['adj1'], context['100000']);
            context['x1'] = Formula['*/'](context['w'], context['adj2'], context['100000']);
            context['y2'] = Formula['*/'](context['h'], context['adj3'], context['100000']);
            context['x2'] = Formula['*/'](context['w'], context['adj4'], context['100000']);
            context['y3'] = Formula['*/'](context['h'], context['adj5'], context['100000']);
            context['x3'] = Formula['*/'](context['w'], context['adj6'], context['100000']);

            return [
                {
                    d: path(context, { extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['b'])} ${lineTo(
                            context,
                            context['l'],
                            context['b']
                        )} ${close(context)}`;
                    }),
                    attrs: { extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['x1'], context['t'])} ${close(
                            context
                        )} ${lineTo(context, context['x1'], context['b'])}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['x1'], context['y1'])} ${lineTo(
                            context,
                            context['x2'],
                            context['y2']
                        )} ${lineTo(context, context['x3'], context['y3'])}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.ACCENT_BORDER_CALLOUT3]: {
        editable: true,
        defaultValue: [18750, -8333, 18750, -16667, 100000, -16667, 112963, -8333],
        defaultKey: ['adj1', 'adj2', 'adj3', 'adj4', 'adj5', 'adj6', 'adj7', 'adj8'],
        formula: (
            width: number,
            height: number,
            [adj1, adj2, adj3, adj4, adj5, adj6, adj7, adj8]: number[]
        ) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;
            context['adj3'] = adj3;
            context['adj4'] = adj4;
            context['adj5'] = adj5;
            context['adj6'] = adj6;
            context['adj7'] = adj7;
            context['adj8'] = adj8;

            context['y1'] = Formula['*/'](context['h'], context['adj1'], context['100000']);
            context['x1'] = Formula['*/'](context['w'], context['adj2'], context['100000']);
            context['y2'] = Formula['*/'](context['h'], context['adj3'], context['100000']);
            context['x2'] = Formula['*/'](context['w'], context['adj4'], context['100000']);
            context['y3'] = Formula['*/'](context['h'], context['adj5'], context['100000']);
            context['x3'] = Formula['*/'](context['w'], context['adj6'], context['100000']);
            context['y4'] = Formula['*/'](context['h'], context['adj7'], context['100000']);
            context['x4'] = Formula['*/'](context['w'], context['adj8'], context['100000']);

            return [
                {
                    d: path(context, { extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['b'])} ${lineTo(
                            context,
                            context['l'],
                            context['b']
                        )} ${close(context)}`;
                    }),
                    attrs: { extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['x1'], context['t'])} ${close(
                            context
                        )} ${lineTo(context, context['x1'], context['b'])}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['x1'], context['y1'])} ${lineTo(
                            context,
                            context['x2'],
                            context['y2']
                        )} ${lineTo(context, context['x3'], context['y3'])} ${lineTo(
                            context,
                            context['x4'],
                            context['y4']
                        )}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.ACCENT_CALLOUT1]: {
        editable: true,
        defaultValue: [18750, -8333, 112500, -38333],
        defaultKey: ['adj1', 'adj2', 'adj3', 'adj4'],
        formula: (width: number, height: number, [adj1, adj2, adj3, adj4]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;
            context['adj3'] = adj3;
            context['adj4'] = adj4;

            context['y1'] = Formula['*/'](context['h'], context['adj1'], context['100000']);
            context['x1'] = Formula['*/'](context['w'], context['adj2'], context['100000']);
            context['y2'] = Formula['*/'](context['h'], context['adj3'], context['100000']);
            context['x2'] = Formula['*/'](context['w'], context['adj4'], context['100000']);

            return [
                {
                    d: path(context, { stroke: 'false', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['b'])} ${lineTo(
                            context,
                            context['l'],
                            context['b']
                        )} ${close(context)}`;
                    }),
                    attrs: { stroke: 'false', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['x1'], context['t'])} ${close(
                            context
                        )} ${lineTo(context, context['x1'], context['b'])}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['x1'], context['y1'])} ${lineTo(
                            context,
                            context['x2'],
                            context['y2']
                        )}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.ACCENT_CALLOUT2]: {
        editable: true,
        defaultValue: [18750, -8333, 18750, -16667, 112500, -46667],
        defaultKey: ['adj1', 'adj2', 'adj3', 'adj4', 'adj5', 'adj6'],
        formula: (
            width: number,
            height: number,
            [adj1, adj2, adj3, adj4, adj5, adj6]: number[]
        ) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;
            context['adj3'] = adj3;
            context['adj4'] = adj4;
            context['adj5'] = adj5;
            context['adj6'] = adj6;

            context['y1'] = Formula['*/'](context['h'], context['adj1'], context['100000']);
            context['x1'] = Formula['*/'](context['w'], context['adj2'], context['100000']);
            context['y2'] = Formula['*/'](context['h'], context['adj3'], context['100000']);
            context['x2'] = Formula['*/'](context['w'], context['adj4'], context['100000']);
            context['y3'] = Formula['*/'](context['h'], context['adj5'], context['100000']);
            context['x3'] = Formula['*/'](context['w'], context['adj6'], context['100000']);

            return [
                {
                    d: path(context, { stroke: 'false', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['b'])} ${lineTo(
                            context,
                            context['l'],
                            context['b']
                        )} ${close(context)}`;
                    }),
                    attrs: { stroke: 'false', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['x1'], context['t'])} ${close(
                            context
                        )} ${lineTo(context, context['x1'], context['b'])}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['x1'], context['y1'])} ${lineTo(
                            context,
                            context['x2'],
                            context['y2']
                        )} ${lineTo(context, context['x3'], context['y3'])}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.ACCENT_CALLOUT3]: {
        editable: true,
        defaultValue: [18750, -8333, 18750, -16667, 100000, -16667, 112963, -8333],
        defaultKey: ['adj1', 'adj2', 'adj3', 'adj4', 'adj5', 'adj6', 'adj7', 'adj8'],
        formula: (
            width: number,
            height: number,
            [adj1, adj2, adj3, adj4, adj5, adj6, adj7, adj8]: number[]
        ) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;
            context['adj3'] = adj3;
            context['adj4'] = adj4;
            context['adj5'] = adj5;
            context['adj6'] = adj6;
            context['adj7'] = adj7;
            context['adj8'] = adj8;

            context['y1'] = Formula['*/'](context['h'], context['adj1'], context['100000']);
            context['x1'] = Formula['*/'](context['w'], context['adj2'], context['100000']);
            context['y2'] = Formula['*/'](context['h'], context['adj3'], context['100000']);
            context['x2'] = Formula['*/'](context['w'], context['adj4'], context['100000']);
            context['y3'] = Formula['*/'](context['h'], context['adj5'], context['100000']);
            context['x3'] = Formula['*/'](context['w'], context['adj6'], context['100000']);
            context['y4'] = Formula['*/'](context['h'], context['adj7'], context['100000']);
            context['x4'] = Formula['*/'](context['w'], context['adj8'], context['100000']);

            return [
                {
                    d: path(context, { stroke: 'false', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['b'])} ${lineTo(
                            context,
                            context['l'],
                            context['b']
                        )} ${close(context)}`;
                    }),
                    attrs: { stroke: 'false', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['x1'], context['t'])} ${close(
                            context
                        )} ${lineTo(context, context['x1'], context['b'])}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['x1'], context['y1'])} ${lineTo(
                            context,
                            context['x2'],
                            context['y2']
                        )} ${lineTo(context, context['x3'], context['y3'])} ${lineTo(
                            context,
                            context['x4'],
                            context['y4']
                        )}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.ACTION_BUTTON_BACK_PREVIOUS]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            context['dx2'] = Formula['*/'](context['ss'], context['3'], context['8']);
            context['g9'] = Formula['+-'](context['vc'], context['0'], context['dx2']);
            context['g10'] = Formula['+-'](context['vc'], context['dx2'], context['0']);
            context['g11'] = Formula['+-'](context['hc'], context['0'], context['dx2']);
            context['g12'] = Formula['+-'](context['hc'], context['dx2'], context['0']);

            return [
                {
                    d: path(context, { stroke: 'false', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['b'])} ${lineTo(
                            context,
                            context['l'],
                            context['b']
                        )} ${close(context)} ${moveTo(
                            context,
                            context['g11'],
                            context['vc']
                        )} ${lineTo(context, context['g12'], context['g9'])} ${lineTo(
                            context,
                            context['g12'],
                            context['g10']
                        )} ${close(context)}`;
                    }),
                    attrs: { stroke: 'false', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(
                        context,
                        { stroke: 'false', fill: 'darken', extrusionOk: 'false' },
                        () => {
                            return `${moveTo(context, context['g11'], context['vc'])} ${lineTo(
                                context,
                                context['g12'],
                                context['g9']
                            )} ${lineTo(context, context['g12'], context['g10'])} ${close(
                                context
                            )}`;
                        }
                    ),
                    attrs: { stroke: 'false', fill: 'darken', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['g11'], context['vc'])} ${lineTo(
                            context,
                            context['g12'],
                            context['g9']
                        )} ${lineTo(context, context['g12'], context['g10'])} ${close(context)}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['b'])} ${lineTo(
                            context,
                            context['l'],
                            context['b']
                        )} ${close(context)}`;
                    }),
                    attrs: { fill: 'none' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.ACTION_BUTTON_BEGINNING]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            context['dx2'] = Formula['*/'](context['ss'], context['3'], context['8']);
            context['g9'] = Formula['+-'](context['vc'], context['0'], context['dx2']);
            context['g10'] = Formula['+-'](context['vc'], context['dx2'], context['0']);
            context['g11'] = Formula['+-'](context['hc'], context['0'], context['dx2']);
            context['g12'] = Formula['+-'](context['hc'], context['dx2'], context['0']);
            context['g13'] = Formula['*/'](context['ss'], context['3'], context['4']);
            context['g14'] = Formula['*/'](context['g13'], context['1'], context['8']);
            context['g15'] = Formula['*/'](context['g13'], context['1'], context['4']);
            context['g16'] = Formula['+-'](context['g11'], context['g14'], context['0']);
            context['g17'] = Formula['+-'](context['g11'], context['g15'], context['0']);

            return [
                {
                    d: path(context, { stroke: 'false', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['b'])} ${lineTo(
                            context,
                            context['l'],
                            context['b']
                        )} ${close(context)} ${moveTo(
                            context,
                            context['g17'],
                            context['vc']
                        )} ${lineTo(context, context['g12'], context['g9'])} ${lineTo(
                            context,
                            context['g12'],
                            context['g10']
                        )} ${close(context)} ${moveTo(
                            context,
                            context['g16'],
                            context['g9']
                        )} ${lineTo(context, context['g11'], context['g9'])} ${lineTo(
                            context,
                            context['g11'],
                            context['g10']
                        )} ${lineTo(context, context['g16'], context['g10'])} ${close(context)}`;
                    }),
                    attrs: { stroke: 'false', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(
                        context,
                        { stroke: 'false', fill: 'darken', extrusionOk: 'false' },
                        () => {
                            return `${moveTo(context, context['g17'], context['vc'])} ${lineTo(
                                context,
                                context['g12'],
                                context['g9']
                            )} ${lineTo(context, context['g12'], context['g10'])} ${close(
                                context
                            )} ${moveTo(context, context['g16'], context['g9'])} ${lineTo(
                                context,
                                context['g11'],
                                context['g9']
                            )} ${lineTo(context, context['g11'], context['g10'])} ${lineTo(
                                context,
                                context['g16'],
                                context['g10']
                            )} ${close(context)}`;
                        }
                    ),
                    attrs: { stroke: 'false', fill: 'darken', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['g17'], context['vc'])} ${lineTo(
                            context,
                            context['g12'],
                            context['g9']
                        )} ${lineTo(context, context['g12'], context['g10'])} ${close(
                            context
                        )} ${moveTo(context, context['g16'], context['g9'])} ${lineTo(
                            context,
                            context['g16'],
                            context['g10']
                        )} ${lineTo(context, context['g11'], context['g10'])} ${lineTo(
                            context,
                            context['g11'],
                            context['g9']
                        )} ${close(context)}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['b'])} ${lineTo(
                            context,
                            context['l'],
                            context['b']
                        )} ${close(context)}`;
                    }),
                    attrs: { fill: 'none' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.ACTION_BUTTON_BLANK]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['b'])} ${lineTo(
                            context,
                            context['l'],
                            context['b']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.ACTION_BUTTON_DOCUMENT]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            context['dx2'] = Formula['*/'](context['ss'], context['3'], context['8']);
            context['g9'] = Formula['+-'](context['vc'], context['0'], context['dx2']);
            context['g10'] = Formula['+-'](context['vc'], context['dx2'], context['0']);
            context['dx1'] = Formula['*/'](context['ss'], context['9'], context['32']);
            context['g11'] = Formula['+-'](context['hc'], context['0'], context['dx1']);
            context['g12'] = Formula['+-'](context['hc'], context['dx1'], context['0']);
            context['g13'] = Formula['*/'](context['ss'], context['3'], context['16']);
            context['g14'] = Formula['+-'](context['g12'], context['0'], context['g13']);
            context['g15'] = Formula['+-'](context['g9'], context['g13'], context['0']);

            return [
                {
                    d: path(context, { stroke: 'false', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['b'])} ${lineTo(
                            context,
                            context['l'],
                            context['b']
                        )} ${close(context)} ${moveTo(
                            context,
                            context['g11'],
                            context['g9']
                        )} ${lineTo(context, context['g14'], context['g9'])} ${lineTo(
                            context,
                            context['g12'],
                            context['g15']
                        )} ${lineTo(context, context['g12'], context['g10'])} ${lineTo(
                            context,
                            context['g11'],
                            context['g10']
                        )} ${close(context)}`;
                    }),
                    attrs: { stroke: 'false', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(
                        context,
                        { stroke: 'false', fill: 'darkenLess', extrusionOk: 'false' },
                        () => {
                            return `${moveTo(context, context['g11'], context['g9'])} ${lineTo(
                                context,
                                context['g14'],
                                context['g9']
                            )} ${lineTo(context, context['g14'], context['g15'])} ${lineTo(
                                context,
                                context['g12'],
                                context['g15']
                            )} ${lineTo(context, context['g12'], context['g10'])} ${lineTo(
                                context,
                                context['g11'],
                                context['g10']
                            )} ${close(context)}`;
                        }
                    ),
                    attrs: { stroke: 'false', fill: 'darkenLess', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(
                        context,
                        { stroke: 'false', fill: 'darken', extrusionOk: 'false' },
                        () => {
                            return `${moveTo(context, context['g14'], context['g9'])} ${lineTo(
                                context,
                                context['g14'],
                                context['g15']
                            )} ${lineTo(context, context['g12'], context['g15'])} ${close(
                                context
                            )}`;
                        }
                    ),
                    attrs: { stroke: 'false', fill: 'darken', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['g11'], context['g9'])} ${lineTo(
                            context,
                            context['g14'],
                            context['g9']
                        )} ${lineTo(context, context['g12'], context['g15'])} ${lineTo(
                            context,
                            context['g12'],
                            context['g10']
                        )} ${lineTo(context, context['g11'], context['g10'])} ${close(
                            context
                        )} ${moveTo(context, context['g12'], context['g15'])} ${lineTo(
                            context,
                            context['g14'],
                            context['g15']
                        )} ${lineTo(context, context['g14'], context['g9'])}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['b'])} ${lineTo(
                            context,
                            context['l'],
                            context['b']
                        )} ${close(context)}`;
                    }),
                    attrs: { fill: 'none' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.ACTION_BUTTON_END]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            context['dx2'] = Formula['*/'](context['ss'], context['3'], context['8']);
            context['g9'] = Formula['+-'](context['vc'], context['0'], context['dx2']);
            context['g10'] = Formula['+-'](context['vc'], context['dx2'], context['0']);
            context['g11'] = Formula['+-'](context['hc'], context['0'], context['dx2']);
            context['g12'] = Formula['+-'](context['hc'], context['dx2'], context['0']);
            context['g13'] = Formula['*/'](context['ss'], context['3'], context['4']);
            context['g14'] = Formula['*/'](context['g13'], context['3'], context['4']);
            context['g15'] = Formula['*/'](context['g13'], context['7'], context['8']);
            context['g16'] = Formula['+-'](context['g11'], context['g14'], context['0']);
            context['g17'] = Formula['+-'](context['g11'], context['g15'], context['0']);

            return [
                {
                    d: path(context, { stroke: 'false', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['b'])} ${lineTo(
                            context,
                            context['l'],
                            context['b']
                        )} ${close(context)} ${moveTo(
                            context,
                            context['g16'],
                            context['vc']
                        )} ${lineTo(context, context['g11'], context['g9'])} ${lineTo(
                            context,
                            context['g11'],
                            context['g10']
                        )} ${close(context)} ${moveTo(
                            context,
                            context['g17'],
                            context['g9']
                        )} ${lineTo(context, context['g12'], context['g9'])} ${lineTo(
                            context,
                            context['g12'],
                            context['g10']
                        )} ${lineTo(context, context['g17'], context['g10'])} ${close(context)}`;
                    }),
                    attrs: { stroke: 'false', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(
                        context,
                        { stroke: 'false', fill: 'darken', extrusionOk: 'false' },
                        () => {
                            return `${moveTo(context, context['g16'], context['vc'])} ${lineTo(
                                context,
                                context['g11'],
                                context['g9']
                            )} ${lineTo(context, context['g11'], context['g10'])} ${close(
                                context
                            )} ${moveTo(context, context['g17'], context['g9'])} ${lineTo(
                                context,
                                context['g12'],
                                context['g9']
                            )} ${lineTo(context, context['g12'], context['g10'])} ${lineTo(
                                context,
                                context['g17'],
                                context['g10']
                            )} ${close(context)}`;
                        }
                    ),
                    attrs: { stroke: 'false', fill: 'darken', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['g16'], context['vc'])} ${lineTo(
                            context,
                            context['g11'],
                            context['g10']
                        )} ${lineTo(context, context['g11'], context['g9'])} ${close(
                            context
                        )} ${moveTo(context, context['g17'], context['g9'])} ${lineTo(
                            context,
                            context['g12'],
                            context['g9']
                        )} ${lineTo(context, context['g12'], context['g10'])} ${lineTo(
                            context,
                            context['g17'],
                            context['g10']
                        )} ${close(context)}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['b'])} ${lineTo(
                            context,
                            context['l'],
                            context['b']
                        )} ${close(context)}`;
                    }),
                    attrs: { fill: 'none' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.ACTION_BUTTON_FORWARD_NEXT]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            context['dx2'] = Formula['*/'](context['ss'], context['3'], context['8']);
            context['g9'] = Formula['+-'](context['vc'], context['0'], context['dx2']);
            context['g10'] = Formula['+-'](context['vc'], context['dx2'], context['0']);
            context['g11'] = Formula['+-'](context['hc'], context['0'], context['dx2']);
            context['g12'] = Formula['+-'](context['hc'], context['dx2'], context['0']);

            return [
                {
                    d: path(context, { stroke: 'false', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['b'])} ${lineTo(
                            context,
                            context['l'],
                            context['b']
                        )} ${close(context)} ${moveTo(
                            context,
                            context['g12'],
                            context['vc']
                        )} ${lineTo(context, context['g11'], context['g9'])} ${lineTo(
                            context,
                            context['g11'],
                            context['g10']
                        )} ${close(context)}`;
                    }),
                    attrs: { stroke: 'false', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(
                        context,
                        { stroke: 'false', fill: 'darken', extrusionOk: 'false' },
                        () => {
                            return `${moveTo(context, context['g12'], context['vc'])} ${lineTo(
                                context,
                                context['g11'],
                                context['g9']
                            )} ${lineTo(context, context['g11'], context['g10'])} ${close(
                                context
                            )}`;
                        }
                    ),
                    attrs: { stroke: 'false', fill: 'darken', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['g12'], context['vc'])} ${lineTo(
                            context,
                            context['g11'],
                            context['g10']
                        )} ${lineTo(context, context['g11'], context['g9'])} ${close(context)}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['b'])} ${lineTo(
                            context,
                            context['l'],
                            context['b']
                        )} ${close(context)}`;
                    }),
                    attrs: { fill: 'none' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.ACTION_BUTTON_HELP]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            context['dx2'] = Formula['*/'](context['ss'], context['3'], context['8']);
            context['g9'] = Formula['+-'](context['vc'], context['0'], context['dx2']);
            context['g11'] = Formula['+-'](context['hc'], context['0'], context['dx2']);
            context['g13'] = Formula['*/'](context['ss'], context['3'], context['4']);
            context['g14'] = Formula['*/'](context['g13'], context['1'], context['7']);
            context['g15'] = Formula['*/'](context['g13'], context['3'], context['14']);
            context['g16'] = Formula['*/'](context['g13'], context['2'], context['7']);
            context['g19'] = Formula['*/'](context['g13'], context['3'], context['7']);
            context['g20'] = Formula['*/'](context['g13'], context['4'], context['7']);
            context['g21'] = Formula['*/'](context['g13'], context['17'], context['28']);
            context['g23'] = Formula['*/'](context['g13'], context['21'], context['28']);
            context['g24'] = Formula['*/'](context['g13'], context['11'], context['14']);
            context['g27'] = Formula['+-'](context['g9'], context['g16'], context['0']);
            context['g29'] = Formula['+-'](context['g9'], context['g21'], context['0']);
            context['g30'] = Formula['+-'](context['g9'], context['g23'], context['0']);
            context['g31'] = Formula['+-'](context['g9'], context['g24'], context['0']);
            context['g33'] = Formula['+-'](context['g11'], context['g15'], context['0']);
            context['g36'] = Formula['+-'](context['g11'], context['g19'], context['0']);
            context['g37'] = Formula['+-'](context['g11'], context['g20'], context['0']);
            context['g41'] = Formula['*/'](context['g13'], context['1'], context['14']);
            context['g42'] = Formula['*/'](context['g13'], context['3'], context['28']);

            return [
                {
                    d: path(context, { stroke: 'false', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['b'])} ${lineTo(
                            context,
                            context['l'],
                            context['b']
                        )} ${close(context)} ${moveTo(
                            context,
                            context['g33'],
                            context['g27']
                        )} ${arcTo(
                            context,
                            context['g16'],
                            context['g16'],
                            context['cd2'],
                            context['cd2']
                        )} ${arcTo(
                            context,
                            context['g14'],
                            context['g15'],
                            context['0'],
                            context['cd4']
                        )} ${arcTo(
                            context,
                            context['g41'],
                            context['g42'],
                            context['3cd4'],
                            context['-5400000']
                        )} ${lineTo(context, context['g37'], context['g30'])} ${lineTo(
                            context,
                            context['g36'],
                            context['g30']
                        )} ${lineTo(context, context['g36'], context['g29'])} ${arcTo(
                            context,
                            context['g14'],
                            context['g15'],
                            context['cd2'],
                            context['cd4']
                        )} ${arcTo(
                            context,
                            context['g41'],
                            context['g42'],
                            context['cd4'],
                            context['-5400000']
                        )} ${arcTo(
                            context,
                            context['g14'],
                            context['g14'],
                            context['0'],
                            context['-10800000']
                        )} ${close(context)} ${moveTo(
                            context,
                            context['hc'],
                            context['g31']
                        )} ${arcTo(
                            context,
                            context['g42'],
                            context['g42'],
                            context['3cd4'],
                            context['21600000']
                        )} ${close(context)}`;
                    }),
                    attrs: { stroke: 'false', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(
                        context,
                        { stroke: 'false', fill: 'darken', extrusionOk: 'false' },
                        () => {
                            return `${moveTo(context, context['g33'], context['g27'])} ${arcTo(
                                context,
                                context['g16'],
                                context['g16'],
                                context['cd2'],
                                context['cd2']
                            )} ${arcTo(
                                context,
                                context['g14'],
                                context['g15'],
                                context['0'],
                                context['cd4']
                            )} ${arcTo(
                                context,
                                context['g41'],
                                context['g42'],
                                context['3cd4'],
                                context['-5400000']
                            )} ${lineTo(context, context['g37'], context['g30'])} ${lineTo(
                                context,
                                context['g36'],
                                context['g30']
                            )} ${lineTo(context, context['g36'], context['g29'])} ${arcTo(
                                context,
                                context['g14'],
                                context['g15'],
                                context['cd2'],
                                context['cd4']
                            )} ${arcTo(
                                context,
                                context['g41'],
                                context['g42'],
                                context['cd4'],
                                context['-5400000']
                            )} ${arcTo(
                                context,
                                context['g14'],
                                context['g14'],
                                context['0'],
                                context['-10800000']
                            )} ${close(context)} ${moveTo(
                                context,
                                context['hc'],
                                context['g31']
                            )} ${arcTo(
                                context,
                                context['g42'],
                                context['g42'],
                                context['3cd4'],
                                context['21600000']
                            )} ${close(context)}`;
                        }
                    ),
                    attrs: { stroke: 'false', fill: 'darken', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['g33'], context['g27'])} ${arcTo(
                            context,
                            context['g16'],
                            context['g16'],
                            context['cd2'],
                            context['cd2']
                        )} ${arcTo(
                            context,
                            context['g14'],
                            context['g15'],
                            context['0'],
                            context['cd4']
                        )} ${arcTo(
                            context,
                            context['g41'],
                            context['g42'],
                            context['3cd4'],
                            context['-5400000']
                        )} ${lineTo(context, context['g37'], context['g30'])} ${lineTo(
                            context,
                            context['g36'],
                            context['g30']
                        )} ${lineTo(context, context['g36'], context['g29'])} ${arcTo(
                            context,
                            context['g14'],
                            context['g15'],
                            context['cd2'],
                            context['cd4']
                        )} ${arcTo(
                            context,
                            context['g41'],
                            context['g42'],
                            context['cd4'],
                            context['-5400000']
                        )} ${arcTo(
                            context,
                            context['g14'],
                            context['g14'],
                            context['0'],
                            context['-10800000']
                        )} ${close(context)} ${moveTo(
                            context,
                            context['hc'],
                            context['g31']
                        )} ${arcTo(
                            context,
                            context['g42'],
                            context['g42'],
                            context['3cd4'],
                            context['21600000']
                        )} ${close(context)}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['b'])} ${lineTo(
                            context,
                            context['l'],
                            context['b']
                        )} ${close(context)}`;
                    }),
                    attrs: { fill: 'none' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.ACTION_BUTTON_HOME]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            context['dx2'] = Formula['*/'](context['ss'], context['3'], context['8']);
            context['g9'] = Formula['+-'](context['vc'], context['0'], context['dx2']);
            context['g10'] = Formula['+-'](context['vc'], context['dx2'], context['0']);
            context['g11'] = Formula['+-'](context['hc'], context['0'], context['dx2']);
            context['g12'] = Formula['+-'](context['hc'], context['dx2'], context['0']);
            context['g13'] = Formula['*/'](context['ss'], context['3'], context['4']);
            context['g14'] = Formula['*/'](context['g13'], context['1'], context['16']);
            context['g15'] = Formula['*/'](context['g13'], context['1'], context['8']);
            context['g16'] = Formula['*/'](context['g13'], context['3'], context['16']);
            context['g17'] = Formula['*/'](context['g13'], context['5'], context['16']);
            context['g18'] = Formula['*/'](context['g13'], context['7'], context['16']);
            context['g19'] = Formula['*/'](context['g13'], context['9'], context['16']);
            context['g20'] = Formula['*/'](context['g13'], context['11'], context['16']);
            context['g21'] = Formula['*/'](context['g13'], context['3'], context['4']);
            context['g22'] = Formula['*/'](context['g13'], context['13'], context['16']);
            context['g23'] = Formula['*/'](context['g13'], context['7'], context['8']);
            context['g24'] = Formula['+-'](context['g9'], context['g14'], context['0']);
            context['g25'] = Formula['+-'](context['g9'], context['g16'], context['0']);
            context['g26'] = Formula['+-'](context['g9'], context['g17'], context['0']);
            context['g27'] = Formula['+-'](context['g9'], context['g21'], context['0']);
            context['g28'] = Formula['+-'](context['g11'], context['g15'], context['0']);
            context['g29'] = Formula['+-'](context['g11'], context['g18'], context['0']);
            context['g30'] = Formula['+-'](context['g11'], context['g19'], context['0']);
            context['g31'] = Formula['+-'](context['g11'], context['g20'], context['0']);
            context['g32'] = Formula['+-'](context['g11'], context['g22'], context['0']);
            context['g33'] = Formula['+-'](context['g11'], context['g23'], context['0']);

            return [
                {
                    d: path(context, { stroke: 'false', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['b'])} ${lineTo(
                            context,
                            context['l'],
                            context['b']
                        )} ${close(context)} ${moveTo(
                            context,
                            context['hc'],
                            context['g9']
                        )} ${lineTo(context, context['g11'], context['vc'])} ${lineTo(
                            context,
                            context['g28'],
                            context['vc']
                        )} ${lineTo(context, context['g28'], context['g10'])} ${lineTo(
                            context,
                            context['g33'],
                            context['g10']
                        )} ${lineTo(context, context['g33'], context['vc'])} ${lineTo(
                            context,
                            context['g12'],
                            context['vc']
                        )} ${lineTo(context, context['g32'], context['g26'])} ${lineTo(
                            context,
                            context['g32'],
                            context['g24']
                        )} ${lineTo(context, context['g31'], context['g24'])} ${lineTo(
                            context,
                            context['g31'],
                            context['g25']
                        )} ${close(context)}`;
                    }),
                    attrs: { stroke: 'false', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(
                        context,
                        { stroke: 'false', fill: 'darkenLess', extrusionOk: 'false' },
                        () => {
                            return `${moveTo(context, context['g32'], context['g26'])} ${lineTo(
                                context,
                                context['g32'],
                                context['g24']
                            )} ${lineTo(context, context['g31'], context['g24'])} ${lineTo(
                                context,
                                context['g31'],
                                context['g25']
                            )} ${close(context)} ${moveTo(
                                context,
                                context['g28'],
                                context['vc']
                            )} ${lineTo(context, context['g28'], context['g10'])} ${lineTo(
                                context,
                                context['g29'],
                                context['g10']
                            )} ${lineTo(context, context['g29'], context['g27'])} ${lineTo(
                                context,
                                context['g30'],
                                context['g27']
                            )} ${lineTo(context, context['g30'], context['g10'])} ${lineTo(
                                context,
                                context['g33'],
                                context['g10']
                            )} ${lineTo(context, context['g33'], context['vc'])} ${close(context)}`;
                        }
                    ),
                    attrs: { stroke: 'false', fill: 'darkenLess', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(
                        context,
                        { stroke: 'false', fill: 'darken', extrusionOk: 'false' },
                        () => {
                            return `${moveTo(context, context['hc'], context['g9'])} ${lineTo(
                                context,
                                context['g11'],
                                context['vc']
                            )} ${lineTo(context, context['g12'], context['vc'])} ${close(
                                context
                            )} ${moveTo(context, context['g29'], context['g27'])} ${lineTo(
                                context,
                                context['g30'],
                                context['g27']
                            )} ${lineTo(context, context['g30'], context['g10'])} ${lineTo(
                                context,
                                context['g29'],
                                context['g10']
                            )} ${close(context)}`;
                        }
                    ),
                    attrs: { stroke: 'false', fill: 'darken', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['hc'], context['g9'])} ${lineTo(
                            context,
                            context['g31'],
                            context['g25']
                        )} ${lineTo(context, context['g31'], context['g24'])} ${lineTo(
                            context,
                            context['g32'],
                            context['g24']
                        )} ${lineTo(context, context['g32'], context['g26'])} ${lineTo(
                            context,
                            context['g12'],
                            context['vc']
                        )} ${lineTo(context, context['g33'], context['vc'])} ${lineTo(
                            context,
                            context['g33'],
                            context['g10']
                        )} ${lineTo(context, context['g28'], context['g10'])} ${lineTo(
                            context,
                            context['g28'],
                            context['vc']
                        )} ${lineTo(context, context['g11'], context['vc'])} ${close(
                            context
                        )} ${moveTo(context, context['g31'], context['g25'])} ${lineTo(
                            context,
                            context['g32'],
                            context['g26']
                        )} ${moveTo(context, context['g33'], context['vc'])} ${lineTo(
                            context,
                            context['g28'],
                            context['vc']
                        )} ${moveTo(context, context['g29'], context['g10'])} ${lineTo(
                            context,
                            context['g29'],
                            context['g27']
                        )} ${lineTo(context, context['g30'], context['g27'])} ${lineTo(
                            context,
                            context['g30'],
                            context['g10']
                        )}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['b'])} ${lineTo(
                            context,
                            context['l'],
                            context['b']
                        )} ${close(context)}`;
                    }),
                    attrs: { fill: 'none' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.ACTION_BUTTON_INFORMATION]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            context['dx2'] = Formula['*/'](context['ss'], context['3'], context['8']);
            context['g9'] = Formula['+-'](context['vc'], context['0'], context['dx2']);
            context['g11'] = Formula['+-'](context['hc'], context['0'], context['dx2']);
            context['g13'] = Formula['*/'](context['ss'], context['3'], context['4']);
            context['g14'] = Formula['*/'](context['g13'], context['1'], context['32']);
            context['g17'] = Formula['*/'](context['g13'], context['5'], context['16']);
            context['g18'] = Formula['*/'](context['g13'], context['3'], context['8']);
            context['g19'] = Formula['*/'](context['g13'], context['13'], context['32']);
            context['g20'] = Formula['*/'](context['g13'], context['19'], context['32']);
            context['g22'] = Formula['*/'](context['g13'], context['11'], context['16']);
            context['g23'] = Formula['*/'](context['g13'], context['13'], context['16']);
            context['g24'] = Formula['*/'](context['g13'], context['7'], context['8']);
            context['g25'] = Formula['+-'](context['g9'], context['g14'], context['0']);
            context['g28'] = Formula['+-'](context['g9'], context['g17'], context['0']);
            context['g29'] = Formula['+-'](context['g9'], context['g18'], context['0']);
            context['g30'] = Formula['+-'](context['g9'], context['g23'], context['0']);
            context['g31'] = Formula['+-'](context['g9'], context['g24'], context['0']);
            context['g32'] = Formula['+-'](context['g11'], context['g17'], context['0']);
            context['g34'] = Formula['+-'](context['g11'], context['g19'], context['0']);
            context['g35'] = Formula['+-'](context['g11'], context['g20'], context['0']);
            context['g37'] = Formula['+-'](context['g11'], context['g22'], context['0']);
            context['g38'] = Formula['*/'](context['g13'], context['3'], context['32']);

            return [
                {
                    d: path(context, { stroke: 'false', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['b'])} ${lineTo(
                            context,
                            context['l'],
                            context['b']
                        )} ${close(context)} ${moveTo(
                            context,
                            context['hc'],
                            context['g9']
                        )} ${arcTo(
                            context,
                            context['dx2'],
                            context['dx2'],
                            context['3cd4'],
                            context['21600000']
                        )} ${close(context)}`;
                    }),
                    attrs: { stroke: 'false', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(
                        context,
                        { stroke: 'false', fill: 'darken', extrusionOk: 'false' },
                        () => {
                            return `${moveTo(context, context['hc'], context['g9'])} ${arcTo(
                                context,
                                context['dx2'],
                                context['dx2'],
                                context['3cd4'],
                                context['21600000']
                            )} ${close(context)} ${moveTo(
                                context,
                                context['hc'],
                                context['g25']
                            )} ${arcTo(
                                context,
                                context['g38'],
                                context['g38'],
                                context['3cd4'],
                                context['21600000']
                            )} ${moveTo(context, context['g32'], context['g28'])} ${lineTo(
                                context,
                                context['g32'],
                                context['g29']
                            )} ${lineTo(context, context['g34'], context['g29'])} ${lineTo(
                                context,
                                context['g34'],
                                context['g30']
                            )} ${lineTo(context, context['g32'], context['g30'])} ${lineTo(
                                context,
                                context['g32'],
                                context['g31']
                            )} ${lineTo(context, context['g37'], context['g31'])} ${lineTo(
                                context,
                                context['g37'],
                                context['g30']
                            )} ${lineTo(context, context['g35'], context['g30'])} ${lineTo(
                                context,
                                context['g35'],
                                context['g28']
                            )} ${close(context)}`;
                        }
                    ),
                    attrs: { stroke: 'false', fill: 'darken', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(
                        context,
                        { stroke: 'false', fill: 'lighten', extrusionOk: 'false' },
                        () => {
                            return `${moveTo(context, context['hc'], context['g25'])} ${arcTo(
                                context,
                                context['g38'],
                                context['g38'],
                                context['3cd4'],
                                context['21600000']
                            )} ${moveTo(context, context['g32'], context['g28'])} ${lineTo(
                                context,
                                context['g35'],
                                context['g28']
                            )} ${lineTo(context, context['g35'], context['g30'])} ${lineTo(
                                context,
                                context['g37'],
                                context['g30']
                            )} ${lineTo(context, context['g37'], context['g31'])} ${lineTo(
                                context,
                                context['g32'],
                                context['g31']
                            )} ${lineTo(context, context['g32'], context['g30'])} ${lineTo(
                                context,
                                context['g34'],
                                context['g30']
                            )} ${lineTo(context, context['g34'], context['g29'])} ${lineTo(
                                context,
                                context['g32'],
                                context['g29']
                            )} ${close(context)}`;
                        }
                    ),
                    attrs: { stroke: 'false', fill: 'lighten', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['hc'], context['g9'])} ${arcTo(
                            context,
                            context['dx2'],
                            context['dx2'],
                            context['3cd4'],
                            context['21600000']
                        )} ${close(context)} ${moveTo(
                            context,
                            context['hc'],
                            context['g25']
                        )} ${arcTo(
                            context,
                            context['g38'],
                            context['g38'],
                            context['3cd4'],
                            context['21600000']
                        )} ${moveTo(context, context['g32'], context['g28'])} ${lineTo(
                            context,
                            context['g35'],
                            context['g28']
                        )} ${lineTo(context, context['g35'], context['g30'])} ${lineTo(
                            context,
                            context['g37'],
                            context['g30']
                        )} ${lineTo(context, context['g37'], context['g31'])} ${lineTo(
                            context,
                            context['g32'],
                            context['g31']
                        )} ${lineTo(context, context['g32'], context['g30'])} ${lineTo(
                            context,
                            context['g34'],
                            context['g30']
                        )} ${lineTo(context, context['g34'], context['g29'])} ${lineTo(
                            context,
                            context['g32'],
                            context['g29']
                        )} ${close(context)}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['b'])} ${lineTo(
                            context,
                            context['l'],
                            context['b']
                        )} ${close(context)}`;
                    }),
                    attrs: { fill: 'none' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.ACTION_BUTTON_MOVIE]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            context['dx2'] = Formula['*/'](context['ss'], context['3'], context['8']);
            context['g9'] = Formula['+-'](context['vc'], context['0'], context['dx2']);
            context['g10'] = Formula['+-'](context['vc'], context['dx2'], context['0']);
            context['g11'] = Formula['+-'](context['hc'], context['0'], context['dx2']);
            context['g12'] = Formula['+-'](context['hc'], context['dx2'], context['0']);
            context['g13'] = Formula['*/'](context['ss'], context['3'], context['4']);
            context['g14'] = Formula['*/'](context['g13'], context['1455'], context['21600']);
            context['g15'] = Formula['*/'](context['g13'], context['1905'], context['21600']);
            context['g16'] = Formula['*/'](context['g13'], context['2325'], context['21600']);
            context['g17'] = Formula['*/'](context['g13'], context['16155'], context['21600']);
            context['g18'] = Formula['*/'](context['g13'], context['17010'], context['21600']);
            context['g19'] = Formula['*/'](context['g13'], context['19335'], context['21600']);
            context['g20'] = Formula['*/'](context['g13'], context['19725'], context['21600']);
            context['g21'] = Formula['*/'](context['g13'], context['20595'], context['21600']);
            context['g22'] = Formula['*/'](context['g13'], context['5280'], context['21600']);
            context['g23'] = Formula['*/'](context['g13'], context['5730'], context['21600']);
            context['g24'] = Formula['*/'](context['g13'], context['6630'], context['21600']);
            context['g25'] = Formula['*/'](context['g13'], context['7492'], context['21600']);
            context['g26'] = Formula['*/'](context['g13'], context['9067'], context['21600']);
            context['g27'] = Formula['*/'](context['g13'], context['9555'], context['21600']);
            context['g28'] = Formula['*/'](context['g13'], context['13342'], context['21600']);
            context['g29'] = Formula['*/'](context['g13'], context['14580'], context['21600']);
            context['g30'] = Formula['*/'](context['g13'], context['15592'], context['21600']);
            context['g31'] = Formula['+-'](context['g11'], context['g14'], context['0']);
            context['g32'] = Formula['+-'](context['g11'], context['g15'], context['0']);
            context['g33'] = Formula['+-'](context['g11'], context['g16'], context['0']);
            context['g34'] = Formula['+-'](context['g11'], context['g17'], context['0']);
            context['g35'] = Formula['+-'](context['g11'], context['g18'], context['0']);
            context['g36'] = Formula['+-'](context['g11'], context['g19'], context['0']);
            context['g37'] = Formula['+-'](context['g11'], context['g20'], context['0']);
            context['g38'] = Formula['+-'](context['g11'], context['g21'], context['0']);
            context['g39'] = Formula['+-'](context['g9'], context['g22'], context['0']);
            context['g40'] = Formula['+-'](context['g9'], context['g23'], context['0']);
            context['g41'] = Formula['+-'](context['g9'], context['g24'], context['0']);
            context['g42'] = Formula['+-'](context['g9'], context['g25'], context['0']);
            context['g43'] = Formula['+-'](context['g9'], context['g26'], context['0']);
            context['g44'] = Formula['+-'](context['g9'], context['g27'], context['0']);
            context['g45'] = Formula['+-'](context['g9'], context['g28'], context['0']);
            context['g46'] = Formula['+-'](context['g9'], context['g29'], context['0']);
            context['g47'] = Formula['+-'](context['g9'], context['g30'], context['0']);
            context['g48'] = Formula['+-'](context['g9'], context['g31'], context['0']);

            return [
                {
                    d: path(context, { stroke: 'false', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['b'])} ${lineTo(
                            context,
                            context['l'],
                            context['b']
                        )} ${close(context)} ${moveTo(
                            context,
                            context['g11'],
                            context['g39']
                        )} ${lineTo(context, context['g11'], context['g44'])} ${lineTo(
                            context,
                            context['g31'],
                            context['g44']
                        )} ${lineTo(context, context['g32'], context['g43'])} ${lineTo(
                            context,
                            context['g33'],
                            context['g43']
                        )} ${lineTo(context, context['g33'], context['g47'])} ${lineTo(
                            context,
                            context['g35'],
                            context['g47']
                        )} ${lineTo(context, context['g35'], context['g45'])} ${lineTo(
                            context,
                            context['g36'],
                            context['g45']
                        )} ${lineTo(context, context['g38'], context['g46'])} ${lineTo(
                            context,
                            context['g12'],
                            context['g46']
                        )} ${lineTo(context, context['g12'], context['g41'])} ${lineTo(
                            context,
                            context['g38'],
                            context['g41']
                        )} ${lineTo(context, context['g37'], context['g42'])} ${lineTo(
                            context,
                            context['g35'],
                            context['g42']
                        )} ${lineTo(context, context['g35'], context['g41'])} ${lineTo(
                            context,
                            context['g34'],
                            context['g40']
                        )} ${lineTo(context, context['g32'], context['g40'])} ${lineTo(
                            context,
                            context['g31'],
                            context['g39']
                        )} ${close(context)}`;
                    }),
                    attrs: { stroke: 'false', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(
                        context,
                        { stroke: 'false', fill: 'darken', extrusionOk: 'false' },
                        () => {
                            return `${moveTo(context, context['g11'], context['g39'])} ${lineTo(
                                context,
                                context['g11'],
                                context['g44']
                            )} ${lineTo(context, context['g31'], context['g44'])} ${lineTo(
                                context,
                                context['g32'],
                                context['g43']
                            )} ${lineTo(context, context['g33'], context['g43'])} ${lineTo(
                                context,
                                context['g33'],
                                context['g47']
                            )} ${lineTo(context, context['g35'], context['g47'])} ${lineTo(
                                context,
                                context['g35'],
                                context['g45']
                            )} ${lineTo(context, context['g36'], context['g45'])} ${lineTo(
                                context,
                                context['g38'],
                                context['g46']
                            )} ${lineTo(context, context['g12'], context['g46'])} ${lineTo(
                                context,
                                context['g12'],
                                context['g41']
                            )} ${lineTo(context, context['g38'], context['g41'])} ${lineTo(
                                context,
                                context['g37'],
                                context['g42']
                            )} ${lineTo(context, context['g35'], context['g42'])} ${lineTo(
                                context,
                                context['g35'],
                                context['g41']
                            )} ${lineTo(context, context['g34'], context['g40'])} ${lineTo(
                                context,
                                context['g32'],
                                context['g40']
                            )} ${lineTo(context, context['g31'], context['g39'])} ${close(
                                context
                            )}`;
                        }
                    ),
                    attrs: { stroke: 'false', fill: 'darken', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['g11'], context['g39'])} ${lineTo(
                            context,
                            context['g31'],
                            context['g39']
                        )} ${lineTo(context, context['g32'], context['g40'])} ${lineTo(
                            context,
                            context['g34'],
                            context['g40']
                        )} ${lineTo(context, context['g35'], context['g41'])} ${lineTo(
                            context,
                            context['g35'],
                            context['g42']
                        )} ${lineTo(context, context['g37'], context['g42'])} ${lineTo(
                            context,
                            context['g38'],
                            context['g41']
                        )} ${lineTo(context, context['g12'], context['g41'])} ${lineTo(
                            context,
                            context['g12'],
                            context['g46']
                        )} ${lineTo(context, context['g38'], context['g46'])} ${lineTo(
                            context,
                            context['g36'],
                            context['g45']
                        )} ${lineTo(context, context['g35'], context['g45'])} ${lineTo(
                            context,
                            context['g35'],
                            context['g47']
                        )} ${lineTo(context, context['g33'], context['g47'])} ${lineTo(
                            context,
                            context['g33'],
                            context['g43']
                        )} ${lineTo(context, context['g32'], context['g43'])} ${lineTo(
                            context,
                            context['g31'],
                            context['g44']
                        )} ${lineTo(context, context['g11'], context['g44'])} ${close(context)}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['b'])} ${lineTo(
                            context,
                            context['l'],
                            context['b']
                        )} ${close(context)}`;
                    }),
                    attrs: { fill: 'none' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.ACTION_BUTTON_RETURN]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            context['dx2'] = Formula['*/'](context['ss'], context['3'], context['8']);
            context['g9'] = Formula['+-'](context['vc'], context['0'], context['dx2']);
            context['g10'] = Formula['+-'](context['vc'], context['dx2'], context['0']);
            context['g11'] = Formula['+-'](context['hc'], context['0'], context['dx2']);
            context['g12'] = Formula['+-'](context['hc'], context['dx2'], context['0']);
            context['g13'] = Formula['*/'](context['ss'], context['3'], context['4']);
            context['g14'] = Formula['*/'](context['g13'], context['7'], context['8']);
            context['g15'] = Formula['*/'](context['g13'], context['3'], context['4']);
            context['g16'] = Formula['*/'](context['g13'], context['5'], context['8']);
            context['g17'] = Formula['*/'](context['g13'], context['3'], context['8']);
            context['g18'] = Formula['*/'](context['g13'], context['1'], context['4']);
            context['g19'] = Formula['+-'](context['g9'], context['g15'], context['0']);
            context['g20'] = Formula['+-'](context['g9'], context['g16'], context['0']);
            context['g21'] = Formula['+-'](context['g9'], context['g18'], context['0']);
            context['g22'] = Formula['+-'](context['g11'], context['g14'], context['0']);
            context['g23'] = Formula['+-'](context['g11'], context['g15'], context['0']);
            context['g24'] = Formula['+-'](context['g11'], context['g16'], context['0']);
            context['g25'] = Formula['+-'](context['g11'], context['g17'], context['0']);
            context['g26'] = Formula['+-'](context['g11'], context['g18'], context['0']);
            context['g27'] = Formula['*/'](context['g13'], context['1'], context['8']);

            return [
                {
                    d: path(context, { stroke: 'false', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['b'])} ${lineTo(
                            context,
                            context['l'],
                            context['b']
                        )} ${close(context)} ${moveTo(
                            context,
                            context['g12'],
                            context['g21']
                        )} ${lineTo(context, context['g23'], context['g9'])} ${lineTo(
                            context,
                            context['hc'],
                            context['g21']
                        )} ${lineTo(context, context['g24'], context['g21'])} ${lineTo(
                            context,
                            context['g24'],
                            context['g20']
                        )} ${arcTo(
                            context,
                            context['g27'],
                            context['g27'],
                            context['0'],
                            context['cd4']
                        )} ${lineTo(context, context['g25'], context['g19'])} ${arcTo(
                            context,
                            context['g27'],
                            context['g27'],
                            context['cd4'],
                            context['cd4']
                        )} ${lineTo(context, context['g26'], context['g21'])} ${lineTo(
                            context,
                            context['g11'],
                            context['g21']
                        )} ${lineTo(context, context['g11'], context['g20'])} ${arcTo(
                            context,
                            context['g17'],
                            context['g17'],
                            context['cd2'],
                            context['-5400000']
                        )} ${lineTo(context, context['hc'], context['g10'])} ${arcTo(
                            context,
                            context['g17'],
                            context['g17'],
                            context['cd4'],
                            context['-5400000']
                        )} ${lineTo(context, context['g22'], context['g21'])} ${close(context)}`;
                    }),
                    attrs: { stroke: 'false', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(
                        context,
                        { stroke: 'false', fill: 'darken', extrusionOk: 'false' },
                        () => {
                            return `${moveTo(context, context['g12'], context['g21'])} ${lineTo(
                                context,
                                context['g23'],
                                context['g9']
                            )} ${lineTo(context, context['hc'], context['g21'])} ${lineTo(
                                context,
                                context['g24'],
                                context['g21']
                            )} ${lineTo(context, context['g24'], context['g20'])} ${arcTo(
                                context,
                                context['g27'],
                                context['g27'],
                                context['0'],
                                context['cd4']
                            )} ${lineTo(context, context['g25'], context['g19'])} ${arcTo(
                                context,
                                context['g27'],
                                context['g27'],
                                context['cd4'],
                                context['cd4']
                            )} ${lineTo(context, context['g26'], context['g21'])} ${lineTo(
                                context,
                                context['g11'],
                                context['g21']
                            )} ${lineTo(context, context['g11'], context['g20'])} ${arcTo(
                                context,
                                context['g17'],
                                context['g17'],
                                context['cd2'],
                                context['-5400000']
                            )} ${lineTo(context, context['hc'], context['g10'])} ${arcTo(
                                context,
                                context['g17'],
                                context['g17'],
                                context['cd4'],
                                context['-5400000']
                            )} ${lineTo(context, context['g22'], context['g21'])} ${close(
                                context
                            )}`;
                        }
                    ),
                    attrs: { stroke: 'false', fill: 'darken', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['g12'], context['g21'])} ${lineTo(
                            context,
                            context['g22'],
                            context['g21']
                        )} ${lineTo(context, context['g22'], context['g20'])} ${arcTo(
                            context,
                            context['g17'],
                            context['g17'],
                            context['0'],
                            context['cd4']
                        )} ${lineTo(context, context['g25'], context['g10'])} ${arcTo(
                            context,
                            context['g17'],
                            context['g17'],
                            context['cd4'],
                            context['cd4']
                        )} ${lineTo(context, context['g11'], context['g21'])} ${lineTo(
                            context,
                            context['g26'],
                            context['g21']
                        )} ${lineTo(context, context['g26'], context['g20'])} ${arcTo(
                            context,
                            context['g27'],
                            context['g27'],
                            context['cd2'],
                            context['-5400000']
                        )} ${lineTo(context, context['hc'], context['g19'])} ${arcTo(
                            context,
                            context['g27'],
                            context['g27'],
                            context['cd4'],
                            context['-5400000']
                        )} ${lineTo(context, context['g24'], context['g21'])} ${lineTo(
                            context,
                            context['hc'],
                            context['g21']
                        )} ${lineTo(context, context['g23'], context['g9'])} ${close(context)}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['b'])} ${lineTo(
                            context,
                            context['l'],
                            context['b']
                        )} ${close(context)}`;
                    }),
                    attrs: { fill: 'none' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.ACTION_BUTTON_SOUND]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            context['dx2'] = Formula['*/'](context['ss'], context['3'], context['8']);
            context['g9'] = Formula['+-'](context['vc'], context['0'], context['dx2']);
            context['g10'] = Formula['+-'](context['vc'], context['dx2'], context['0']);
            context['g11'] = Formula['+-'](context['hc'], context['0'], context['dx2']);
            context['g12'] = Formula['+-'](context['hc'], context['dx2'], context['0']);
            context['g13'] = Formula['*/'](context['ss'], context['3'], context['4']);
            context['g14'] = Formula['*/'](context['g13'], context['1'], context['8']);
            context['g15'] = Formula['*/'](context['g13'], context['5'], context['16']);
            context['g16'] = Formula['*/'](context['g13'], context['5'], context['8']);
            context['g17'] = Formula['*/'](context['g13'], context['11'], context['16']);
            context['g18'] = Formula['*/'](context['g13'], context['3'], context['4']);
            context['g19'] = Formula['*/'](context['g13'], context['7'], context['8']);
            context['g20'] = Formula['+-'](context['g9'], context['g14'], context['0']);
            context['g21'] = Formula['+-'](context['g9'], context['g15'], context['0']);
            context['g22'] = Formula['+-'](context['g9'], context['g17'], context['0']);
            context['g23'] = Formula['+-'](context['g9'], context['g19'], context['0']);
            context['g24'] = Formula['+-'](context['g11'], context['g15'], context['0']);
            context['g25'] = Formula['+-'](context['g11'], context['g16'], context['0']);
            context['g26'] = Formula['+-'](context['g11'], context['g18'], context['0']);

            return [
                {
                    d: path(context, { stroke: 'false', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['b'])} ${lineTo(
                            context,
                            context['l'],
                            context['b']
                        )} ${close(context)} ${moveTo(
                            context,
                            context['g11'],
                            context['g21']
                        )} ${lineTo(context, context['g11'], context['g22'])} ${lineTo(
                            context,
                            context['g24'],
                            context['g22']
                        )} ${lineTo(context, context['g25'], context['g10'])} ${lineTo(
                            context,
                            context['g25'],
                            context['g9']
                        )} ${lineTo(context, context['g24'], context['g21'])} ${close(context)}`;
                    }),
                    attrs: { stroke: 'false', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(
                        context,
                        { stroke: 'false', fill: 'darken', extrusionOk: 'false' },
                        () => {
                            return `${moveTo(context, context['g11'], context['g21'])} ${lineTo(
                                context,
                                context['g11'],
                                context['g22']
                            )} ${lineTo(context, context['g24'], context['g22'])} ${lineTo(
                                context,
                                context['g25'],
                                context['g10']
                            )} ${lineTo(context, context['g25'], context['g9'])} ${lineTo(
                                context,
                                context['g24'],
                                context['g21']
                            )} ${close(context)}`;
                        }
                    ),
                    attrs: { stroke: 'false', fill: 'darken', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['g11'], context['g21'])} ${lineTo(
                            context,
                            context['g24'],
                            context['g21']
                        )} ${lineTo(context, context['g25'], context['g9'])} ${lineTo(
                            context,
                            context['g25'],
                            context['g10']
                        )} ${lineTo(context, context['g24'], context['g22'])} ${lineTo(
                            context,
                            context['g11'],
                            context['g22']
                        )} ${close(context)} ${moveTo(
                            context,
                            context['g26'],
                            context['g21']
                        )} ${lineTo(context, context['g12'], context['g20'])} ${moveTo(
                            context,
                            context['g26'],
                            context['vc']
                        )} ${lineTo(context, context['g12'], context['vc'])} ${moveTo(
                            context,
                            context['g26'],
                            context['g22']
                        )} ${lineTo(context, context['g12'], context['g23'])}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['b'])} ${lineTo(
                            context,
                            context['l'],
                            context['b']
                        )} ${close(context)}`;
                    }),
                    attrs: { fill: 'none' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.ARC]: {
        editable: true,
        defaultValue: [16200000, 0],
        defaultKey: ['adj1', 'adj2'],
        formula: (width: number, height: number, [adj1, adj2]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;

            context['stAng'] = Formula['pin'](context['0'], context['adj1'], context['21599999']);
            context['enAng'] = Formula['pin'](context['0'], context['adj2'], context['21599999']);
            context['sw11'] = Formula['+-'](context['enAng'], context['0'], context['stAng']);
            context['sw12'] = Formula['+-'](context['sw11'], context['21600000'], context['0']);
            context['swAng'] = Formula['?:'](context['sw11'], context['sw11'], context['sw12']);
            context['wt1'] = Formula['sin'](context['wd2'], context['stAng']);
            context['ht1'] = Formula['cos'](context['hd2'], context['stAng']);
            context['dx1'] = Formula['cat2'](context['wd2'], context['ht1'], context['wt1']);
            context['dy1'] = Formula['sat2'](context['hd2'], context['ht1'], context['wt1']);
            context['wt2'] = Formula['sin'](context['wd2'], context['enAng']);
            context['ht2'] = Formula['cos'](context['hd2'], context['enAng']);
            context['dx2'] = Formula['cat2'](context['wd2'], context['ht2'], context['wt2']);
            context['dy2'] = Formula['sat2'](context['hd2'], context['ht2'], context['wt2']);
            context['x1'] = Formula['+-'](context['hc'], context['dx1'], context['0']);
            context['y1'] = Formula['+-'](context['vc'], context['dy1'], context['0']);
            context['x2'] = Formula['+-'](context['hc'], context['dx2'], context['0']);
            context['y2'] = Formula['+-'](context['vc'], context['dy2'], context['0']);
            context['sw0'] = Formula['+-'](context['21600000'], context['0'], context['stAng']);
            context['da1'] = Formula['+-'](context['swAng'], context['0'], context['sw0']);
            context['g1'] = Formula['max'](context['x1'], context['x2']);
            context['ir'] = Formula['?:'](context['da1'], context['r'], context['g1']);
            context['sw1'] = Formula['+-'](context['cd4'], context['0'], context['stAng']);
            context['sw2'] = Formula['+-'](context['27000000'], context['0'], context['stAng']);
            context['sw3'] = Formula['?:'](context['sw1'], context['sw1'], context['sw2']);
            context['da2'] = Formula['+-'](context['swAng'], context['0'], context['sw3']);
            context['g5'] = Formula['max'](context['y1'], context['y2']);
            context['ib'] = Formula['?:'](context['da2'], context['b'], context['g5']);
            context['sw4'] = Formula['+-'](context['cd2'], context['0'], context['stAng']);
            context['sw5'] = Formula['+-'](context['32400000'], context['0'], context['stAng']);
            context['sw6'] = Formula['?:'](context['sw4'], context['sw4'], context['sw5']);
            context['da3'] = Formula['+-'](context['swAng'], context['0'], context['sw6']);
            context['g9'] = Formula['min'](context['x1'], context['x2']);
            context['il'] = Formula['?:'](context['da3'], context['l'], context['g9']);
            context['sw7'] = Formula['+-'](context['3cd4'], context['0'], context['stAng']);
            context['sw8'] = Formula['+-'](context['37800000'], context['0'], context['stAng']);
            context['sw9'] = Formula['?:'](context['sw7'], context['sw7'], context['sw8']);
            context['da4'] = Formula['+-'](context['swAng'], context['0'], context['sw9']);
            context['g13'] = Formula['min'](context['y1'], context['y2']);
            context['it'] = Formula['?:'](context['da4'], context['t'], context['g13']);
            context['cang1'] = Formula['+-'](context['stAng'], context['0'], context['cd4']);
            context['cang2'] = Formula['+-'](context['enAng'], context['cd4'], context['0']);
            context['cang3'] = Formula['+/'](context['cang1'], context['cang2'], context['2']);

            return [
                {
                    d: path(context, { stroke: 'false', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['x1'], context['y1'])} ${arcTo(
                            context,
                            context['wd2'],
                            context['hd2'],
                            context['stAng'],
                            context['swAng']
                        )} ${lineTo(context, context['hc'], context['vc'])} ${close(context)}`;
                    }),
                    attrs: { stroke: 'false', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none' }, () => {
                        return `${moveTo(context, context['x1'], context['y1'])} ${arcTo(
                            context,
                            context['wd2'],
                            context['hd2'],
                            context['stAng'],
                            context['swAng']
                        )}`;
                    }),
                    attrs: { fill: 'none' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.BENT_ARROW]: {
        editable: true,
        defaultValue: [25000, 25000, 25000, 43750],
        defaultKey: ['adj1', 'adj2', 'adj3', 'adj4'],
        formula: (width: number, height: number, [adj1, adj2, adj3, adj4]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;
            context['adj3'] = adj3;
            context['adj4'] = adj4;

            context['a2'] = Formula['pin'](context['0'], context['adj2'], context['50000']);
            context['maxAdj1'] = Formula['*/'](context['a2'], context['2'], context['1']);
            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['maxAdj1']);
            context['a3'] = Formula['pin'](context['0'], context['adj3'], context['50000']);
            context['th'] = Formula['*/'](context['ss'], context['a1'], context['100000']);
            context['aw2'] = Formula['*/'](context['ss'], context['a2'], context['100000']);
            context['th2'] = Formula['*/'](context['th'], context['1'], context['2']);
            context['dh2'] = Formula['+-'](context['aw2'], context['0'], context['th2']);
            context['ah'] = Formula['*/'](context['ss'], context['a3'], context['100000']);
            context['bw'] = Formula['+-'](context['r'], context['0'], context['ah']);
            context['bh'] = Formula['+-'](context['b'], context['0'], context['dh2']);
            context['bs'] = Formula['min'](context['bw'], context['bh']);
            context['maxAdj4'] = Formula['*/'](context['100000'], context['bs'], context['ss']);
            context['a4'] = Formula['pin'](context['0'], context['adj4'], context['maxAdj4']);
            context['bd'] = Formula['*/'](context['ss'], context['a4'], context['100000']);
            context['bd3'] = Formula['+-'](context['bd'], context['0'], context['th']);
            context['bd2'] = Formula['max'](context['bd3'], context['0']);
            context['x3'] = Formula['+-'](context['th'], context['bd2'], context['0']);
            context['x4'] = Formula['+-'](context['r'], context['0'], context['ah']);
            context['y3'] = Formula['+-'](context['dh2'], context['th'], context['0']);
            context['y4'] = Formula['+-'](context['y3'], context['dh2'], context['0']);
            context['y5'] = Formula['+-'](context['dh2'], context['bd'], context['0']);
            context['y6'] = Formula['+-'](context['y3'], context['bd2'], context['0']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['b'])} ${lineTo(
                            context,
                            context['l'],
                            context['y5']
                        )} ${arcTo(
                            context,
                            context['bd'],
                            context['bd'],
                            context['cd2'],
                            context['cd4']
                        )} ${lineTo(context, context['x4'], context['dh2'])} ${lineTo(
                            context,
                            context['x4'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['aw2'])} ${lineTo(
                            context,
                            context['x4'],
                            context['y4']
                        )} ${lineTo(context, context['x4'], context['y3'])} ${lineTo(
                            context,
                            context['x3'],
                            context['y3']
                        )} ${arcTo(
                            context,
                            context['bd2'],
                            context['bd2'],
                            context['3cd4'],
                            context['-5400000']
                        )} ${lineTo(context, context['th'], context['b'])} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.BENT_CONNECTOR2]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            return [
                {
                    d: path(context, { fill: 'none' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['b'])}`;
                    }),
                    attrs: { fill: 'none' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.BENT_CONNECTOR3]: {
        editable: true,
        defaultValue: [50000],
        defaultKey: ['adj1'],
        formula: (width: number, height: number, [adj1]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;

            context['x1'] = Formula['*/'](context['w'], context['adj1'], context['100000']);

            return [
                {
                    d: path(context, { fill: 'none' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['x1'],
                            context['t']
                        )} ${lineTo(context, context['x1'], context['b'])} ${lineTo(
                            context,
                            context['r'],
                            context['b']
                        )}`;
                    }),
                    attrs: { fill: 'none' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.BENT_CONNECTOR4]: {
        editable: true,
        defaultValue: [50000, 50000],
        defaultKey: ['adj1', 'adj2'],
        formula: (width: number, height: number, [adj1, adj2]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;

            context['x1'] = Formula['*/'](context['w'], context['adj1'], context['100000']);
            context['x2'] = Formula['+/'](context['x1'], context['r'], context['2']);
            context['y2'] = Formula['*/'](context['h'], context['adj2'], context['100000']);
            context['y1'] = Formula['+/'](context['t'], context['y2'], context['2']);

            return [
                {
                    d: path(context, { fill: 'none' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['x1'],
                            context['t']
                        )} ${lineTo(context, context['x1'], context['y2'])} ${lineTo(
                            context,
                            context['r'],
                            context['y2']
                        )} ${lineTo(context, context['r'], context['b'])}`;
                    }),
                    attrs: { fill: 'none' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.BENT_CONNECTOR5]: {
        editable: true,
        defaultValue: [50000, 50000, 50000],
        defaultKey: ['adj1', 'adj2', 'adj3'],
        formula: (width: number, height: number, [adj1, adj2, adj3]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;
            context['adj3'] = adj3;

            context['x1'] = Formula['*/'](context['w'], context['adj1'], context['100000']);
            context['x3'] = Formula['*/'](context['w'], context['adj3'], context['100000']);
            context['x2'] = Formula['+/'](context['x1'], context['x3'], context['2']);
            context['y2'] = Formula['*/'](context['h'], context['adj2'], context['100000']);
            context['y1'] = Formula['+/'](context['t'], context['y2'], context['2']);
            context['y3'] = Formula['+/'](context['b'], context['y2'], context['2']);

            return [
                {
                    d: path(context, { fill: 'none' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['x1'],
                            context['t']
                        )} ${lineTo(context, context['x1'], context['y2'])} ${lineTo(
                            context,
                            context['x3'],
                            context['y2']
                        )} ${lineTo(context, context['x3'], context['b'])} ${lineTo(
                            context,
                            context['r'],
                            context['b']
                        )}`;
                    }),
                    attrs: { fill: 'none' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.BENT_UP_ARROW]: {
        editable: true,
        defaultValue: [25000, 25000, 25000],
        defaultKey: ['adj1', 'adj2', 'adj3'],
        formula: (width: number, height: number, [adj1, adj2, adj3]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;
            context['adj3'] = adj3;

            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['50000']);
            context['a2'] = Formula['pin'](context['0'], context['adj2'], context['50000']);
            context['a3'] = Formula['pin'](context['0'], context['adj3'], context['50000']);
            context['y1'] = Formula['*/'](context['ss'], context['a3'], context['100000']);
            context['dx1'] = Formula['*/'](context['ss'], context['a2'], context['50000']);
            context['x1'] = Formula['+-'](context['r'], context['0'], context['dx1']);
            context['dx3'] = Formula['*/'](context['ss'], context['a2'], context['100000']);
            context['x3'] = Formula['+-'](context['r'], context['0'], context['dx3']);
            context['dx2'] = Formula['*/'](context['ss'], context['a1'], context['200000']);
            context['x2'] = Formula['+-'](context['x3'], context['0'], context['dx2']);
            context['x4'] = Formula['+-'](context['x3'], context['dx2'], context['0']);
            context['dy2'] = Formula['*/'](context['ss'], context['a1'], context['100000']);
            context['y2'] = Formula['+-'](context['b'], context['0'], context['dy2']);
            context['x0'] = Formula['*/'](context['x4'], context['1'], context['2']);
            context['y3'] = Formula['+/'](context['y2'], context['b'], context['2']);
            context['y15'] = Formula['+/'](context['y1'], context['b'], context['2']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['y2'])} ${lineTo(
                            context,
                            context['x2'],
                            context['y2']
                        )} ${lineTo(context, context['x2'], context['y1'])} ${lineTo(
                            context,
                            context['x1'],
                            context['y1']
                        )} ${lineTo(context, context['x3'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['y1']
                        )} ${lineTo(context, context['x4'], context['y1'])} ${lineTo(
                            context,
                            context['x4'],
                            context['b']
                        )} ${lineTo(context, context['l'], context['b'])} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.BEVEL]: {
        editable: true,
        defaultValue: [12500],
        defaultKey: ['adj'],
        formula: (width: number, height: number, [adj]: number[]) => {
            const context = getContext(width, height);
            context['adj'] = adj;

            context['a'] = Formula['pin'](context['0'], context['adj'], context['50000']);
            context['x1'] = Formula['*/'](context['ss'], context['a'], context['100000']);
            context['x2'] = Formula['+-'](context['r'], context['0'], context['x1']);
            context['y2'] = Formula['+-'](context['b'], context['0'], context['x1']);

            return [
                {
                    d: path(context, { stroke: 'false', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['x1'], context['x1'])} ${lineTo(
                            context,
                            context['x2'],
                            context['x1']
                        )} ${lineTo(context, context['x2'], context['y2'])} ${lineTo(
                            context,
                            context['x1'],
                            context['y2']
                        )} ${close(context)}`;
                    }),
                    attrs: { stroke: 'false', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(
                        context,
                        { stroke: 'false', fill: 'lightenLess', extrusionOk: 'false' },
                        () => {
                            return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                                context,
                                context['r'],
                                context['t']
                            )} ${lineTo(context, context['x2'], context['x1'])} ${lineTo(
                                context,
                                context['x1'],
                                context['x1']
                            )} ${close(context)}`;
                        }
                    ),
                    attrs: { stroke: 'false', fill: 'lightenLess', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(
                        context,
                        { stroke: 'false', fill: 'darkenLess', extrusionOk: 'false' },
                        () => {
                            return `${moveTo(context, context['l'], context['b'])} ${lineTo(
                                context,
                                context['x1'],
                                context['y2']
                            )} ${lineTo(context, context['x2'], context['y2'])} ${lineTo(
                                context,
                                context['r'],
                                context['b']
                            )} ${close(context)}`;
                        }
                    ),
                    attrs: { stroke: 'false', fill: 'darkenLess', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(
                        context,
                        { stroke: 'false', fill: 'lighten', extrusionOk: 'false' },
                        () => {
                            return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                                context,
                                context['x1'],
                                context['x1']
                            )} ${lineTo(context, context['x1'], context['y2'])} ${lineTo(
                                context,
                                context['l'],
                                context['b']
                            )} ${close(context)}`;
                        }
                    ),
                    attrs: { stroke: 'false', fill: 'lighten', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(
                        context,
                        { stroke: 'false', fill: 'darken', extrusionOk: 'false' },
                        () => {
                            return `${moveTo(context, context['r'], context['t'])} ${lineTo(
                                context,
                                context['r'],
                                context['b']
                            )} ${lineTo(context, context['x2'], context['y2'])} ${lineTo(
                                context,
                                context['x2'],
                                context['x1']
                            )} ${close(context)}`;
                        }
                    ),
                    attrs: { stroke: 'false', fill: 'darken', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['b'])} ${lineTo(
                            context,
                            context['l'],
                            context['b']
                        )} ${close(context)} ${moveTo(
                            context,
                            context['x1'],
                            context['x1']
                        )} ${lineTo(context, context['x2'], context['x1'])} ${lineTo(
                            context,
                            context['x2'],
                            context['y2']
                        )} ${lineTo(context, context['x1'], context['y2'])} ${close(
                            context
                        )} ${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['x1'],
                            context['x1']
                        )} ${moveTo(context, context['l'], context['b'])} ${lineTo(
                            context,
                            context['x1'],
                            context['y2']
                        )} ${moveTo(context, context['r'], context['t'])} ${lineTo(
                            context,
                            context['x2'],
                            context['x1']
                        )} ${moveTo(context, context['r'], context['b'])} ${lineTo(
                            context,
                            context['x2'],
                            context['y2']
                        )}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.BLOCK_ARC]: {
        editable: true,
        defaultValue: [10800000, 0, 25000],
        defaultKey: ['adj1', 'adj2', 'adj3'],
        formula: (width: number, height: number, [adj1, adj2, adj3]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;
            context['adj3'] = adj3;

            context['stAng'] = Formula['pin'](context['0'], context['adj1'], context['21599999']);
            context['istAng'] = Formula['pin'](context['0'], context['adj2'], context['21599999']);
            context['a3'] = Formula['pin'](context['0'], context['adj3'], context['50000']);
            context['sw11'] = Formula['+-'](context['istAng'], context['0'], context['stAng']);
            context['sw12'] = Formula['+-'](context['sw11'], context['21600000'], context['0']);
            context['swAng'] = Formula['?:'](context['sw11'], context['sw11'], context['sw12']);
            context['iswAng'] = Formula['+-'](context['0'], context['0'], context['swAng']);
            context['wt1'] = Formula['sin'](context['wd2'], context['stAng']);
            context['ht1'] = Formula['cos'](context['hd2'], context['stAng']);
            context['wt3'] = Formula['sin'](context['wd2'], context['istAng']);
            context['ht3'] = Formula['cos'](context['hd2'], context['istAng']);
            context['dx1'] = Formula['cat2'](context['wd2'], context['ht1'], context['wt1']);
            context['dy1'] = Formula['sat2'](context['hd2'], context['ht1'], context['wt1']);
            context['dx3'] = Formula['cat2'](context['wd2'], context['ht3'], context['wt3']);
            context['dy3'] = Formula['sat2'](context['hd2'], context['ht3'], context['wt3']);
            context['x1'] = Formula['+-'](context['hc'], context['dx1'], context['0']);
            context['y1'] = Formula['+-'](context['vc'], context['dy1'], context['0']);
            context['x3'] = Formula['+-'](context['hc'], context['dx3'], context['0']);
            context['y3'] = Formula['+-'](context['vc'], context['dy3'], context['0']);
            context['dr'] = Formula['*/'](context['ss'], context['a3'], context['100000']);
            context['iwd2'] = Formula['+-'](context['wd2'], context['0'], context['dr']);
            context['ihd2'] = Formula['+-'](context['hd2'], context['0'], context['dr']);
            context['wt2'] = Formula['sin'](context['iwd2'], context['istAng']);
            context['ht2'] = Formula['cos'](context['ihd2'], context['istAng']);
            context['wt4'] = Formula['sin'](context['iwd2'], context['stAng']);
            context['ht4'] = Formula['cos'](context['ihd2'], context['stAng']);
            context['dx2'] = Formula['cat2'](context['iwd2'], context['ht2'], context['wt2']);
            context['dy2'] = Formula['sat2'](context['ihd2'], context['ht2'], context['wt2']);
            context['dx4'] = Formula['cat2'](context['iwd2'], context['ht4'], context['wt4']);
            context['dy4'] = Formula['sat2'](context['ihd2'], context['ht4'], context['wt4']);
            context['x2'] = Formula['+-'](context['hc'], context['dx2'], context['0']);
            context['y2'] = Formula['+-'](context['vc'], context['dy2'], context['0']);
            context['x4'] = Formula['+-'](context['hc'], context['dx4'], context['0']);
            context['y4'] = Formula['+-'](context['vc'], context['dy4'], context['0']);
            context['sw0'] = Formula['+-'](context['21600000'], context['0'], context['stAng']);
            context['da1'] = Formula['+-'](context['swAng'], context['0'], context['sw0']);
            context['g1'] = Formula['max'](context['x1'], context['x2']);
            context['g2'] = Formula['max'](context['x3'], context['x4']);
            context['g3'] = Formula['max'](context['g1'], context['g2']);
            context['ir'] = Formula['?:'](context['da1'], context['r'], context['g3']);
            context['sw1'] = Formula['+-'](context['cd4'], context['0'], context['stAng']);
            context['sw2'] = Formula['+-'](context['27000000'], context['0'], context['stAng']);
            context['sw3'] = Formula['?:'](context['sw1'], context['sw1'], context['sw2']);
            context['da2'] = Formula['+-'](context['swAng'], context['0'], context['sw3']);
            context['g5'] = Formula['max'](context['y1'], context['y2']);
            context['g6'] = Formula['max'](context['y3'], context['y4']);
            context['g7'] = Formula['max'](context['g5'], context['g6']);
            context['ib'] = Formula['?:'](context['da2'], context['b'], context['g7']);
            context['sw4'] = Formula['+-'](context['cd2'], context['0'], context['stAng']);
            context['sw5'] = Formula['+-'](context['32400000'], context['0'], context['stAng']);
            context['sw6'] = Formula['?:'](context['sw4'], context['sw4'], context['sw5']);
            context['da3'] = Formula['+-'](context['swAng'], context['0'], context['sw6']);
            context['g9'] = Formula['min'](context['x1'], context['x2']);
            context['g10'] = Formula['min'](context['x3'], context['x4']);
            context['g11'] = Formula['min'](context['g9'], context['g10']);
            context['il'] = Formula['?:'](context['da3'], context['l'], context['g11']);
            context['sw7'] = Formula['+-'](context['3cd4'], context['0'], context['stAng']);
            context['sw8'] = Formula['+-'](context['37800000'], context['0'], context['stAng']);
            context['sw9'] = Formula['?:'](context['sw7'], context['sw7'], context['sw8']);
            context['da4'] = Formula['+-'](context['swAng'], context['0'], context['sw9']);
            context['g13'] = Formula['min'](context['y1'], context['y2']);
            context['g14'] = Formula['min'](context['y3'], context['y4']);
            context['g15'] = Formula['min'](context['g13'], context['g14']);
            context['it'] = Formula['?:'](context['da4'], context['t'], context['g15']);
            context['x5'] = Formula['+/'](context['x1'], context['x4'], context['2']);
            context['y5'] = Formula['+/'](context['y1'], context['y4'], context['2']);
            context['x6'] = Formula['+/'](context['x3'], context['x2'], context['2']);
            context['y6'] = Formula['+/'](context['y3'], context['y2'], context['2']);
            context['cang1'] = Formula['+-'](context['stAng'], context['0'], context['cd4']);
            context['cang2'] = Formula['+-'](context['istAng'], context['cd4'], context['0']);
            context['cang3'] = Formula['+/'](context['cang1'], context['cang2'], context['2']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['x1'], context['y1'])} ${arcTo(
                            context,
                            context['wd2'],
                            context['hd2'],
                            context['stAng'],
                            context['swAng']
                        )} ${lineTo(context, context['x2'], context['y2'])} ${arcTo(
                            context,
                            context['iwd2'],
                            context['ihd2'],
                            context['istAng'],
                            context['iswAng']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.BORDER_CALLOUT1]: {
        editable: true,
        defaultValue: [18750, -8333, 112500, -38333],
        defaultKey: ['adj1', 'adj2', 'adj3', 'adj4'],
        formula: (width: number, height: number, [adj1, adj2, adj3, adj4]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;
            context['adj3'] = adj3;
            context['adj4'] = adj4;

            context['y1'] = Formula['*/'](context['h'], context['adj1'], context['100000']);
            context['x1'] = Formula['*/'](context['w'], context['adj2'], context['100000']);
            context['y2'] = Formula['*/'](context['h'], context['adj3'], context['100000']);
            context['x2'] = Formula['*/'](context['w'], context['adj4'], context['100000']);

            return [
                {
                    d: path(context, { extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['b'])} ${lineTo(
                            context,
                            context['l'],
                            context['b']
                        )} ${close(context)}`;
                    }),
                    attrs: { extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['x1'], context['y1'])} ${lineTo(
                            context,
                            context['x2'],
                            context['y2']
                        )}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.BORDER_CALLOUT2]: {
        editable: true,
        defaultValue: [18750, -8333, 18750, -16667, 112500, -46667],
        defaultKey: ['adj1', 'adj2', 'adj3', 'adj4', 'adj5', 'adj6'],
        formula: (
            width: number,
            height: number,
            [adj1, adj2, adj3, adj4, adj5, adj6]: number[]
        ) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;
            context['adj3'] = adj3;
            context['adj4'] = adj4;
            context['adj5'] = adj5;
            context['adj6'] = adj6;

            context['y1'] = Formula['*/'](context['h'], context['adj1'], context['100000']);
            context['x1'] = Formula['*/'](context['w'], context['adj2'], context['100000']);
            context['y2'] = Formula['*/'](context['h'], context['adj3'], context['100000']);
            context['x2'] = Formula['*/'](context['w'], context['adj4'], context['100000']);
            context['y3'] = Formula['*/'](context['h'], context['adj5'], context['100000']);
            context['x3'] = Formula['*/'](context['w'], context['adj6'], context['100000']);

            return [
                {
                    d: path(context, { extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['b'])} ${lineTo(
                            context,
                            context['l'],
                            context['b']
                        )} ${close(context)}`;
                    }),
                    attrs: { extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['x1'], context['y1'])} ${lineTo(
                            context,
                            context['x2'],
                            context['y2']
                        )} ${lineTo(context, context['x3'], context['y3'])}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.BORDER_CALLOUT3]: {
        editable: true,
        defaultValue: [18750, -8333, 18750, -16667, 100000, -16667, 112963, -8333],
        defaultKey: ['adj1', 'adj2', 'adj3', 'adj4', 'adj5', 'adj6', 'adj7', 'adj8'],
        formula: (
            width: number,
            height: number,
            [adj1, adj2, adj3, adj4, adj5, adj6, adj7, adj8]: number[]
        ) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;
            context['adj3'] = adj3;
            context['adj4'] = adj4;
            context['adj5'] = adj5;
            context['adj6'] = adj6;
            context['adj7'] = adj7;
            context['adj8'] = adj8;

            context['y1'] = Formula['*/'](context['h'], context['adj1'], context['100000']);
            context['x1'] = Formula['*/'](context['w'], context['adj2'], context['100000']);
            context['y2'] = Formula['*/'](context['h'], context['adj3'], context['100000']);
            context['x2'] = Formula['*/'](context['w'], context['adj4'], context['100000']);
            context['y3'] = Formula['*/'](context['h'], context['adj5'], context['100000']);
            context['x3'] = Formula['*/'](context['w'], context['adj6'], context['100000']);
            context['y4'] = Formula['*/'](context['h'], context['adj7'], context['100000']);
            context['x4'] = Formula['*/'](context['w'], context['adj8'], context['100000']);

            return [
                {
                    d: path(context, { extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['b'])} ${lineTo(
                            context,
                            context['l'],
                            context['b']
                        )} ${close(context)}`;
                    }),
                    attrs: { extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['x1'], context['y1'])} ${lineTo(
                            context,
                            context['x2'],
                            context['y2']
                        )} ${lineTo(context, context['x3'], context['y3'])} ${lineTo(
                            context,
                            context['x4'],
                            context['y4']
                        )}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.BRACE_PAIR]: {
        editable: true,
        defaultValue: [8333],
        defaultKey: ['adj'],
        formula: (width: number, height: number, [adj]: number[]) => {
            const context = getContext(width, height);
            context['adj'] = adj;

            context['a'] = Formula['pin'](context['0'], context['adj'], context['25000']);
            context['x1'] = Formula['*/'](context['ss'], context['a'], context['100000']);
            context['x2'] = Formula['*/'](context['ss'], context['a'], context['50000']);
            context['x3'] = Formula['+-'](context['r'], context['0'], context['x2']);
            context['x4'] = Formula['+-'](context['r'], context['0'], context['x1']);
            context['y2'] = Formula['+-'](context['vc'], context['0'], context['x1']);
            context['y3'] = Formula['+-'](context['vc'], context['x1'], context['0']);
            context['y4'] = Formula['+-'](context['b'], context['0'], context['x1']);
            context['it'] = Formula['*/'](context['x1'], context['29289'], context['100000']);
            context['il'] = Formula['+-'](context['x1'], context['it'], context['0']);
            context['ir'] = Formula['+-'](context['r'], context['0'], context['il']);
            context['ib'] = Formula['+-'](context['b'], context['0'], context['it']);

            return [
                {
                    d: path(context, { stroke: 'false', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['x2'], context['b'])} ${arcTo(
                            context,
                            context['x1'],
                            context['x1'],
                            context['cd4'],
                            context['cd4']
                        )} ${lineTo(context, context['x1'], context['y3'])} ${arcTo(
                            context,
                            context['x1'],
                            context['x1'],
                            context['0'],
                            context['-5400000']
                        )} ${arcTo(
                            context,
                            context['x1'],
                            context['x1'],
                            context['cd4'],
                            context['-5400000']
                        )} ${lineTo(context, context['x1'], context['x1'])} ${arcTo(
                            context,
                            context['x1'],
                            context['x1'],
                            context['cd2'],
                            context['cd4']
                        )} ${lineTo(context, context['x3'], context['t'])} ${arcTo(
                            context,
                            context['x1'],
                            context['x1'],
                            context['3cd4'],
                            context['cd4']
                        )} ${lineTo(context, context['x4'], context['y2'])} ${arcTo(
                            context,
                            context['x1'],
                            context['x1'],
                            context['cd2'],
                            context['-5400000']
                        )} ${arcTo(
                            context,
                            context['x1'],
                            context['x1'],
                            context['3cd4'],
                            context['-5400000']
                        )} ${lineTo(context, context['x4'], context['y4'])} ${arcTo(
                            context,
                            context['x1'],
                            context['x1'],
                            context['0'],
                            context['cd4']
                        )} ${close(context)}`;
                    }),
                    attrs: { stroke: 'false', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none' }, () => {
                        return `${moveTo(context, context['x2'], context['b'])} ${arcTo(
                            context,
                            context['x1'],
                            context['x1'],
                            context['cd4'],
                            context['cd4']
                        )} ${lineTo(context, context['x1'], context['y3'])} ${arcTo(
                            context,
                            context['x1'],
                            context['x1'],
                            context['0'],
                            context['-5400000']
                        )} ${arcTo(
                            context,
                            context['x1'],
                            context['x1'],
                            context['cd4'],
                            context['-5400000']
                        )} ${lineTo(context, context['x1'], context['x1'])} ${arcTo(
                            context,
                            context['x1'],
                            context['x1'],
                            context['cd2'],
                            context['cd4']
                        )} ${moveTo(context, context['x3'], context['t'])} ${arcTo(
                            context,
                            context['x1'],
                            context['x1'],
                            context['3cd4'],
                            context['cd4']
                        )} ${lineTo(context, context['x4'], context['y2'])} ${arcTo(
                            context,
                            context['x1'],
                            context['x1'],
                            context['cd2'],
                            context['-5400000']
                        )} ${arcTo(
                            context,
                            context['x1'],
                            context['x1'],
                            context['3cd4'],
                            context['-5400000']
                        )} ${lineTo(context, context['x4'], context['y4'])} ${arcTo(
                            context,
                            context['x1'],
                            context['x1'],
                            context['0'],
                            context['cd4']
                        )}`;
                    }),
                    attrs: { fill: 'none' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.BRACKET_PAIR]: {
        editable: true,
        defaultValue: [16667],
        defaultKey: ['adj'],
        formula: (width: number, height: number, [adj]: number[]) => {
            const context = getContext(width, height);
            context['adj'] = adj;

            context['a'] = Formula['pin'](context['0'], context['adj'], context['50000']);
            context['x1'] = Formula['*/'](context['ss'], context['a'], context['100000']);
            context['x2'] = Formula['+-'](context['r'], context['0'], context['x1']);
            context['y2'] = Formula['+-'](context['b'], context['0'], context['x1']);
            context['il'] = Formula['*/'](context['x1'], context['29289'], context['100000']);
            context['ir'] = Formula['+-'](context['r'], context['0'], context['il']);
            context['ib'] = Formula['+-'](context['b'], context['0'], context['il']);

            return [
                {
                    d: path(context, { stroke: 'false', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['l'], context['x1'])} ${arcTo(
                            context,
                            context['x1'],
                            context['x1'],
                            context['cd2'],
                            context['cd4']
                        )} ${lineTo(context, context['x2'], context['t'])} ${arcTo(
                            context,
                            context['x1'],
                            context['x1'],
                            context['3cd4'],
                            context['cd4']
                        )} ${lineTo(context, context['r'], context['y2'])} ${arcTo(
                            context,
                            context['x1'],
                            context['x1'],
                            context['0'],
                            context['cd4']
                        )} ${lineTo(context, context['x1'], context['b'])} ${arcTo(
                            context,
                            context['x1'],
                            context['x1'],
                            context['cd4'],
                            context['cd4']
                        )} ${close(context)}`;
                    }),
                    attrs: { stroke: 'false', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none' }, () => {
                        return `${moveTo(context, context['x1'], context['b'])} ${arcTo(
                            context,
                            context['x1'],
                            context['x1'],
                            context['cd4'],
                            context['cd4']
                        )} ${lineTo(context, context['l'], context['x1'])} ${arcTo(
                            context,
                            context['x1'],
                            context['x1'],
                            context['cd2'],
                            context['cd4']
                        )} ${moveTo(context, context['x2'], context['t'])} ${arcTo(
                            context,
                            context['x1'],
                            context['x1'],
                            context['3cd4'],
                            context['cd4']
                        )} ${lineTo(context, context['r'], context['y2'])} ${arcTo(
                            context,
                            context['x1'],
                            context['x1'],
                            context['0'],
                            context['cd4']
                        )}`;
                    }),
                    attrs: { fill: 'none' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.CALLOUT1]: {
        editable: true,
        defaultValue: [18750, -8333, 112500, -38333],
        defaultKey: ['adj1', 'adj2', 'adj3', 'adj4'],
        formula: (width: number, height: number, [adj1, adj2, adj3, adj4]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;
            context['adj3'] = adj3;
            context['adj4'] = adj4;

            context['y1'] = Formula['*/'](context['h'], context['adj1'], context['100000']);
            context['x1'] = Formula['*/'](context['w'], context['adj2'], context['100000']);
            context['y2'] = Formula['*/'](context['h'], context['adj3'], context['100000']);
            context['x2'] = Formula['*/'](context['w'], context['adj4'], context['100000']);

            return [
                {
                    d: path(context, { stroke: 'false', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['b'])} ${lineTo(
                            context,
                            context['l'],
                            context['b']
                        )} ${close(context)}`;
                    }),
                    attrs: { stroke: 'false', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['x1'], context['y1'])} ${lineTo(
                            context,
                            context['x2'],
                            context['y2']
                        )}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.CALLOUT2]: {
        editable: true,
        defaultValue: [18750, -8333, 18750, -16667, 112500, -46667],
        defaultKey: ['adj1', 'adj2', 'adj3', 'adj4', 'adj5', 'adj6'],
        formula: (
            width: number,
            height: number,
            [adj1, adj2, adj3, adj4, adj5, adj6]: number[]
        ) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;
            context['adj3'] = adj3;
            context['adj4'] = adj4;
            context['adj5'] = adj5;
            context['adj6'] = adj6;

            context['y1'] = Formula['*/'](context['h'], context['adj1'], context['100000']);
            context['x1'] = Formula['*/'](context['w'], context['adj2'], context['100000']);
            context['y2'] = Formula['*/'](context['h'], context['adj3'], context['100000']);
            context['x2'] = Formula['*/'](context['w'], context['adj4'], context['100000']);
            context['y3'] = Formula['*/'](context['h'], context['adj5'], context['100000']);
            context['x3'] = Formula['*/'](context['w'], context['adj6'], context['100000']);

            return [
                {
                    d: path(context, { stroke: 'false', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['b'])} ${lineTo(
                            context,
                            context['l'],
                            context['b']
                        )} ${close(context)}`;
                    }),
                    attrs: { stroke: 'false', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['x1'], context['y1'])} ${lineTo(
                            context,
                            context['x2'],
                            context['y2']
                        )} ${lineTo(context, context['x3'], context['y3'])}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.CALLOUT3]: {
        editable: true,
        defaultValue: [18750, -8333, 18750, -16667, 100000, -16667, 112963, -8333],
        defaultKey: ['adj1', 'adj2', 'adj3', 'adj4', 'adj5', 'adj6', 'adj7', 'adj8'],
        formula: (
            width: number,
            height: number,
            [adj1, adj2, adj3, adj4, adj5, adj6, adj7, adj8]: number[]
        ) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;
            context['adj3'] = adj3;
            context['adj4'] = adj4;
            context['adj5'] = adj5;
            context['adj6'] = adj6;
            context['adj7'] = adj7;
            context['adj8'] = adj8;

            context['y1'] = Formula['*/'](context['h'], context['adj1'], context['100000']);
            context['x1'] = Formula['*/'](context['w'], context['adj2'], context['100000']);
            context['y2'] = Formula['*/'](context['h'], context['adj3'], context['100000']);
            context['x2'] = Formula['*/'](context['w'], context['adj4'], context['100000']);
            context['y3'] = Formula['*/'](context['h'], context['adj5'], context['100000']);
            context['x3'] = Formula['*/'](context['w'], context['adj6'], context['100000']);
            context['y4'] = Formula['*/'](context['h'], context['adj7'], context['100000']);
            context['x4'] = Formula['*/'](context['w'], context['adj8'], context['100000']);

            return [
                {
                    d: path(context, { stroke: 'false', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['b'])} ${lineTo(
                            context,
                            context['l'],
                            context['b']
                        )} ${close(context)}`;
                    }),
                    attrs: { stroke: 'false', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['x1'], context['y1'])} ${lineTo(
                            context,
                            context['x2'],
                            context['y2']
                        )} ${lineTo(context, context['x3'], context['y3'])} ${lineTo(
                            context,
                            context['x4'],
                            context['y4']
                        )}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.CAN]: {
        editable: true,
        defaultValue: [25000],
        defaultKey: ['adj'],
        formula: (width: number, height: number, [adj]: number[]) => {
            const context = getContext(width, height);
            context['adj'] = adj;

            context['maxAdj'] = Formula['*/'](context['50000'], context['h'], context['ss']);
            context['a'] = Formula['pin'](context['0'], context['adj'], context['maxAdj']);
            context['y1'] = Formula['*/'](context['ss'], context['a'], context['200000']);
            context['y2'] = Formula['+-'](context['y1'], context['y1'], context['0']);
            context['y3'] = Formula['+-'](context['b'], context['0'], context['y1']);

            return [
                {
                    d: path(context, { stroke: 'false', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['l'], context['y1'])} ${arcTo(
                            context,
                            context['wd2'],
                            context['y1'],
                            context['cd2'],
                            context['-10800000']
                        )} ${lineTo(context, context['r'], context['y3'])} ${arcTo(
                            context,
                            context['wd2'],
                            context['y1'],
                            context['0'],
                            context['cd2']
                        )} ${close(context)}`;
                    }),
                    attrs: { stroke: 'false', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(
                        context,
                        { stroke: 'false', fill: 'lighten', extrusionOk: 'false' },
                        () => {
                            return `${moveTo(context, context['l'], context['y1'])} ${arcTo(
                                context,
                                context['wd2'],
                                context['y1'],
                                context['cd2'],
                                context['cd2']
                            )} ${arcTo(
                                context,
                                context['wd2'],
                                context['y1'],
                                context['0'],
                                context['cd2']
                            )} ${close(context)}`;
                        }
                    ),
                    attrs: { stroke: 'false', fill: 'lighten', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['r'], context['y1'])} ${arcTo(
                            context,
                            context['wd2'],
                            context['y1'],
                            context['0'],
                            context['cd2']
                        )} ${arcTo(
                            context,
                            context['wd2'],
                            context['y1'],
                            context['cd2'],
                            context['cd2']
                        )} ${lineTo(context, context['r'], context['y3'])} ${arcTo(
                            context,
                            context['wd2'],
                            context['y1'],
                            context['0'],
                            context['cd2']
                        )} ${lineTo(context, context['l'], context['y1'])}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.CHART_PLUS]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            return [
                {
                    d: path(context, { w: 10, h: 10, fill: 'none', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['5'], context['0'])} ${lineTo(
                            context,
                            context['5'],
                            context['10']
                        )} ${moveTo(context, context['0'], context['5'])} ${lineTo(
                            context,
                            context['10'],
                            context['5']
                        )}`;
                    }),
                    attrs: { w: 10, h: 10, fill: 'none', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { w: 10, h: 10, stroke: 'false' }, () => {
                        return `${moveTo(context, context['0'], context['0'])} ${lineTo(
                            context,
                            context['0'],
                            context['10']
                        )} ${lineTo(context, context['10'], context['10'])} ${lineTo(
                            context,
                            context['10'],
                            context['0']
                        )} ${close(context)}`;
                    }),
                    attrs: { w: 10, h: 10, stroke: 'false' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.CHART_STAR]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            return [
                {
                    d: path(context, { w: 10, h: 10, fill: 'none', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['0'], context['0'])} ${lineTo(
                            context,
                            context['10'],
                            context['10']
                        )} ${moveTo(context, context['0'], context['10'])} ${lineTo(
                            context,
                            context['10'],
                            context['0']
                        )} ${moveTo(context, context['5'], context['0'])} ${lineTo(
                            context,
                            context['5'],
                            context['10']
                        )}`;
                    }),
                    attrs: { w: 10, h: 10, fill: 'none', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { w: 10, h: 10, stroke: 'false' }, () => {
                        return `${moveTo(context, context['0'], context['0'])} ${lineTo(
                            context,
                            context['0'],
                            context['10']
                        )} ${lineTo(context, context['10'], context['10'])} ${lineTo(
                            context,
                            context['10'],
                            context['0']
                        )} ${close(context)}`;
                    }),
                    attrs: { w: 10, h: 10, stroke: 'false' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.CHART_X]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            return [
                {
                    d: path(context, { w: 10, h: 10, fill: 'none', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['0'], context['0'])} ${lineTo(
                            context,
                            context['10'],
                            context['10']
                        )} ${moveTo(context, context['0'], context['10'])} ${lineTo(
                            context,
                            context['10'],
                            context['0']
                        )}`;
                    }),
                    attrs: { w: 10, h: 10, fill: 'none', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { w: 10, h: 10, stroke: 'false' }, () => {
                        return `${moveTo(context, context['0'], context['0'])} ${lineTo(
                            context,
                            context['0'],
                            context['10']
                        )} ${lineTo(context, context['10'], context['10'])} ${lineTo(
                            context,
                            context['10'],
                            context['0']
                        )} ${close(context)}`;
                    }),
                    attrs: { w: 10, h: 10, stroke: 'false' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.CHEVRON]: {
        editable: true,
        defaultValue: [50000],
        defaultKey: ['adj'],
        formula: (width: number, height: number, [adj]: number[]) => {
            const context = getContext(width, height);
            context['adj'] = adj;

            context['maxAdj'] = Formula['*/'](context['100000'], context['w'], context['ss']);
            context['a'] = Formula['pin'](context['0'], context['adj'], context['maxAdj']);
            context['x1'] = Formula['*/'](context['ss'], context['a'], context['100000']);
            context['x2'] = Formula['+-'](context['r'], context['0'], context['x1']);
            context['x3'] = Formula['*/'](context['x2'], context['1'], context['2']);
            context['dx'] = Formula['+-'](context['x2'], context['0'], context['x1']);
            context['il'] = Formula['?:'](context['dx'], context['x1'], context['l']);
            context['ir'] = Formula['?:'](context['dx'], context['x2'], context['r']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['x2'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['vc'])} ${lineTo(
                            context,
                            context['x2'],
                            context['b']
                        )} ${lineTo(context, context['l'], context['b'])} ${lineTo(
                            context,
                            context['x1'],
                            context['vc']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.CHORD]: {
        editable: true,
        defaultValue: [2700000, 16200000],
        defaultKey: ['adj1', 'adj2'],
        formula: (width: number, height: number, [adj1, adj2]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;

            context['stAng'] = Formula['pin'](context['0'], context['adj1'], context['21599999']);
            context['enAng'] = Formula['pin'](context['0'], context['adj2'], context['21599999']);
            context['sw1'] = Formula['+-'](context['enAng'], context['0'], context['stAng']);
            context['sw2'] = Formula['+-'](context['sw1'], context['21600000'], context['0']);
            context['swAng'] = Formula['?:'](context['sw1'], context['sw1'], context['sw2']);
            context['wt1'] = Formula['sin'](context['wd2'], context['stAng']);
            context['ht1'] = Formula['cos'](context['hd2'], context['stAng']);
            context['dx1'] = Formula['cat2'](context['wd2'], context['ht1'], context['wt1']);
            context['dy1'] = Formula['sat2'](context['hd2'], context['ht1'], context['wt1']);
            context['wt2'] = Formula['sin'](context['wd2'], context['enAng']);
            context['ht2'] = Formula['cos'](context['hd2'], context['enAng']);
            context['dx2'] = Formula['cat2'](context['wd2'], context['ht2'], context['wt2']);
            context['dy2'] = Formula['sat2'](context['hd2'], context['ht2'], context['wt2']);
            context['x1'] = Formula['+-'](context['hc'], context['dx1'], context['0']);
            context['y1'] = Formula['+-'](context['vc'], context['dy1'], context['0']);
            context['x2'] = Formula['+-'](context['hc'], context['dx2'], context['0']);
            context['y2'] = Formula['+-'](context['vc'], context['dy2'], context['0']);
            context['x3'] = Formula['+/'](context['x1'], context['x2'], context['2']);
            context['y3'] = Formula['+/'](context['y1'], context['y2'], context['2']);
            context['midAng0'] = Formula['*/'](context['swAng'], context['1'], context['2']);
            context['midAng'] = Formula['+-'](context['stAng'], context['midAng0'], context['cd2']);
            context['idx'] = Formula['cos'](context['wd2'], context['2700000']);
            context['idy'] = Formula['sin'](context['hd2'], context['2700000']);
            context['il'] = Formula['+-'](context['hc'], context['0'], context['idx']);
            context['ir'] = Formula['+-'](context['hc'], context['idx'], context['0']);
            context['it'] = Formula['+-'](context['vc'], context['0'], context['idy']);
            context['ib'] = Formula['+-'](context['vc'], context['idy'], context['0']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['x1'], context['y1'])} ${arcTo(
                            context,
                            context['wd2'],
                            context['hd2'],
                            context['stAng'],
                            context['swAng']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.CIRCULAR_ARROW]: {
        editable: true,
        defaultValue: [12500, 1142319, 20457681, 10800000, 12500],
        defaultKey: ['adj1', 'adj2', 'adj3', 'adj4', 'adj5'],
        formula: (width: number, height: number, [adj1, adj2, adj3, adj4, adj5]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;
            context['adj3'] = adj3;
            context['adj4'] = adj4;
            context['adj5'] = adj5;

            context['a5'] = Formula['pin'](context['0'], context['adj5'], context['25000']);
            context['maxAdj1'] = Formula['*/'](context['a5'], context['2'], context['1']);
            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['maxAdj1']);
            context['enAng'] = Formula['pin'](context['1'], context['adj3'], context['21599999']);
            context['stAng'] = Formula['pin'](context['0'], context['adj4'], context['21599999']);
            context['th'] = Formula['*/'](context['ss'], context['a1'], context['100000']);
            context['thh'] = Formula['*/'](context['ss'], context['a5'], context['100000']);
            context['th2'] = Formula['*/'](context['th'], context['1'], context['2']);
            context['rw1'] = Formula['+-'](context['wd2'], context['th2'], context['thh']);
            context['rh1'] = Formula['+-'](context['hd2'], context['th2'], context['thh']);
            context['rw2'] = Formula['+-'](context['rw1'], context['0'], context['th']);
            context['rh2'] = Formula['+-'](context['rh1'], context['0'], context['th']);
            context['rw3'] = Formula['+-'](context['rw2'], context['th2'], context['0']);
            context['rh3'] = Formula['+-'](context['rh2'], context['th2'], context['0']);
            context['wtH'] = Formula['sin'](context['rw3'], context['enAng']);
            context['htH'] = Formula['cos'](context['rh3'], context['enAng']);
            context['dxH'] = Formula['cat2'](context['rw3'], context['htH'], context['wtH']);
            context['dyH'] = Formula['sat2'](context['rh3'], context['htH'], context['wtH']);
            context['xH'] = Formula['+-'](context['hc'], context['dxH'], context['0']);
            context['yH'] = Formula['+-'](context['vc'], context['dyH'], context['0']);
            context['rI'] = Formula['min'](context['rw2'], context['rh2']);
            context['u1'] = Formula['*/'](context['dxH'], context['dxH'], context['1']);
            context['u2'] = Formula['*/'](context['dyH'], context['dyH'], context['1']);
            context['u3'] = Formula['*/'](context['rI'], context['rI'], context['1']);
            context['u4'] = Formula['+-'](context['u1'], context['0'], context['u3']);
            context['u5'] = Formula['+-'](context['u2'], context['0'], context['u3']);
            context['u6'] = Formula['*/'](context['u4'], context['u5'], context['u1']);
            context['u7'] = Formula['*/'](context['u6'], context['1'], context['u2']);
            context['u8'] = Formula['+-'](context['1'], context['0'], context['u7']);
            context['u9'] = Formula['sqrt'](context['u8']);
            context['u10'] = Formula['*/'](context['u4'], context['1'], context['dxH']);
            context['u11'] = Formula['*/'](context['u10'], context['1'], context['dyH']);
            context['u12'] = Formula['+/'](context['1'], context['u9'], context['u11']);
            context['u13'] = Formula['at2'](context['1'], context['u12']);
            context['u14'] = Formula['+-'](context['u13'], context['21600000'], context['0']);
            context['u15'] = Formula['?:'](context['u13'], context['u13'], context['u14']);
            context['u16'] = Formula['+-'](context['u15'], context['0'], context['enAng']);
            context['u17'] = Formula['+-'](context['u16'], context['21600000'], context['0']);
            context['u18'] = Formula['?:'](context['u16'], context['u16'], context['u17']);
            context['u19'] = Formula['+-'](context['u18'], context['0'], context['cd2']);
            context['u20'] = Formula['+-'](context['u18'], context['0'], context['21600000']);
            context['u21'] = Formula['?:'](context['u19'], context['u20'], context['u18']);
            context['maxAng'] = Formula['abs'](context['u21']);
            context['aAng'] = Formula['pin'](context['0'], context['adj2'], context['maxAng']);
            context['ptAng'] = Formula['+-'](context['enAng'], context['aAng'], context['0']);
            context['wtA'] = Formula['sin'](context['rw3'], context['ptAng']);
            context['htA'] = Formula['cos'](context['rh3'], context['ptAng']);
            context['dxA'] = Formula['cat2'](context['rw3'], context['htA'], context['wtA']);
            context['dyA'] = Formula['sat2'](context['rh3'], context['htA'], context['wtA']);
            context['xA'] = Formula['+-'](context['hc'], context['dxA'], context['0']);
            context['yA'] = Formula['+-'](context['vc'], context['dyA'], context['0']);
            context['wtE'] = Formula['sin'](context['rw1'], context['stAng']);
            context['htE'] = Formula['cos'](context['rh1'], context['stAng']);
            context['dxE'] = Formula['cat2'](context['rw1'], context['htE'], context['wtE']);
            context['dyE'] = Formula['sat2'](context['rh1'], context['htE'], context['wtE']);
            context['xE'] = Formula['+-'](context['hc'], context['dxE'], context['0']);
            context['yE'] = Formula['+-'](context['vc'], context['dyE'], context['0']);
            context['dxG'] = Formula['cos'](context['thh'], context['ptAng']);
            context['dyG'] = Formula['sin'](context['thh'], context['ptAng']);
            context['xG'] = Formula['+-'](context['xH'], context['dxG'], context['0']);
            context['yG'] = Formula['+-'](context['yH'], context['dyG'], context['0']);
            context['dxB'] = Formula['cos'](context['thh'], context['ptAng']);
            context['dyB'] = Formula['sin'](context['thh'], context['ptAng']);
            context['xB'] = Formula['+-'](
                context['xH'],
                context['0'],
                context['dxB'],
                context['0']
            );
            context['yB'] = Formula['+-'](
                context['yH'],
                context['0'],
                context['dyB'],
                context['0']
            );
            context['sx1'] = Formula['+-'](context['xB'], context['0'], context['hc']);
            context['sy1'] = Formula['+-'](context['yB'], context['0'], context['vc']);
            context['sx2'] = Formula['+-'](context['xG'], context['0'], context['hc']);
            context['sy2'] = Formula['+-'](context['yG'], context['0'], context['vc']);
            context['rO'] = Formula['min'](context['rw1'], context['rh1']);
            context['x1O'] = Formula['*/'](context['sx1'], context['rO'], context['rw1']);
            context['y1O'] = Formula['*/'](context['sy1'], context['rO'], context['rh1']);
            context['x2O'] = Formula['*/'](context['sx2'], context['rO'], context['rw1']);
            context['y2O'] = Formula['*/'](context['sy2'], context['rO'], context['rh1']);
            context['dxO'] = Formula['+-'](context['x2O'], context['0'], context['x1O']);
            context['dyO'] = Formula['+-'](context['y2O'], context['0'], context['y1O']);
            context['dO'] = Formula['mod'](context['dxO'], context['dyO'], context['0']);
            context['q1'] = Formula['*/'](context['x1O'], context['y2O'], context['1']);
            context['q2'] = Formula['*/'](context['x2O'], context['y1O'], context['1']);
            context['DO'] = Formula['+-'](context['q1'], context['0'], context['q2']);
            context['q3'] = Formula['*/'](context['rO'], context['rO'], context['1']);
            context['q4'] = Formula['*/'](context['dO'], context['dO'], context['1']);
            context['q5'] = Formula['*/'](context['q3'], context['q4'], context['1']);
            context['q6'] = Formula['*/'](context['DO'], context['DO'], context['1']);
            context['q7'] = Formula['+-'](context['q5'], context['0'], context['q6']);
            context['q8'] = Formula['max'](context['q7'], context['0']);
            context['sdelO'] = Formula['sqrt'](context['q8']);
            context['ndyO'] = Formula['*/'](context['dyO'], context['-1'], context['1']);
            context['sdyO'] = Formula['?:'](context['ndyO'], context['-1'], context['1']);
            context['q9'] = Formula['*/'](context['sdyO'], context['dxO'], context['1']);
            context['q10'] = Formula['*/'](context['q9'], context['sdelO'], context['1']);
            context['q11'] = Formula['*/'](context['DO'], context['dyO'], context['1']);
            context['dxF1'] = Formula['+/'](context['q11'], context['q10'], context['q4']);
            context['q12'] = Formula['+-'](context['q11'], context['0'], context['q10']);
            context['dxF2'] = Formula['*/'](context['q12'], context['1'], context['q4']);
            context['adyO'] = Formula['abs'](context['dyO']);
            context['q13'] = Formula['*/'](context['adyO'], context['sdelO'], context['1']);
            context['q14'] = Formula['*/'](context['DO'], context['dxO'], context['-1']);
            context['dyF1'] = Formula['+/'](context['q14'], context['q13'], context['q4']);
            context['q15'] = Formula['+-'](context['q14'], context['0'], context['q13']);
            context['dyF2'] = Formula['*/'](context['q15'], context['1'], context['q4']);
            context['q16'] = Formula['+-'](context['x2O'], context['0'], context['dxF1']);
            context['q17'] = Formula['+-'](context['x2O'], context['0'], context['dxF2']);
            context['q18'] = Formula['+-'](context['y2O'], context['0'], context['dyF1']);
            context['q19'] = Formula['+-'](context['y2O'], context['0'], context['dyF2']);
            context['q20'] = Formula['mod'](context['q16'], context['q18'], context['0']);
            context['q21'] = Formula['mod'](context['q17'], context['q19'], context['0']);
            context['q22'] = Formula['+-'](context['q21'], context['0'], context['q20']);
            context['dxF'] = Formula['?:'](context['q22'], context['dxF1'], context['dxF2']);
            context['dyF'] = Formula['?:'](context['q22'], context['dyF1'], context['dyF2']);
            context['sdxF'] = Formula['*/'](context['dxF'], context['rw1'], context['rO']);
            context['sdyF'] = Formula['*/'](context['dyF'], context['rh1'], context['rO']);
            context['xF'] = Formula['+-'](context['hc'], context['sdxF'], context['0']);
            context['yF'] = Formula['+-'](context['vc'], context['sdyF'], context['0']);
            context['x1I'] = Formula['*/'](context['sx1'], context['rI'], context['rw2']);
            context['y1I'] = Formula['*/'](context['sy1'], context['rI'], context['rh2']);
            context['x2I'] = Formula['*/'](context['sx2'], context['rI'], context['rw2']);
            context['y2I'] = Formula['*/'](context['sy2'], context['rI'], context['rh2']);
            context['dxI'] = Formula['+-'](context['x2I'], context['0'], context['x1I']);
            context['dyI'] = Formula['+-'](context['y2I'], context['0'], context['y1I']);
            context['dI'] = Formula['mod'](context['dxI'], context['dyI'], context['0']);
            context['v1'] = Formula['*/'](context['x1I'], context['y2I'], context['1']);
            context['v2'] = Formula['*/'](context['x2I'], context['y1I'], context['1']);
            context['DI'] = Formula['+-'](context['v1'], context['0'], context['v2']);
            context['v3'] = Formula['*/'](context['rI'], context['rI'], context['1']);
            context['v4'] = Formula['*/'](context['dI'], context['dI'], context['1']);
            context['v5'] = Formula['*/'](context['v3'], context['v4'], context['1']);
            context['v6'] = Formula['*/'](context['DI'], context['DI'], context['1']);
            context['v7'] = Formula['+-'](context['v5'], context['0'], context['v6']);
            context['v8'] = Formula['max'](context['v7'], context['0']);
            context['sdelI'] = Formula['sqrt'](context['v8']);
            context['v9'] = Formula['*/'](context['sdyO'], context['dxI'], context['1']);
            context['v10'] = Formula['*/'](context['v9'], context['sdelI'], context['1']);
            context['v11'] = Formula['*/'](context['DI'], context['dyI'], context['1']);
            context['dxC1'] = Formula['+/'](context['v11'], context['v10'], context['v4']);
            context['v12'] = Formula['+-'](context['v11'], context['0'], context['v10']);
            context['dxC2'] = Formula['*/'](context['v12'], context['1'], context['v4']);
            context['adyI'] = Formula['abs'](context['dyI']);
            context['v13'] = Formula['*/'](context['adyI'], context['sdelI'], context['1']);
            context['v14'] = Formula['*/'](context['DI'], context['dxI'], context['-1']);
            context['dyC1'] = Formula['+/'](context['v14'], context['v13'], context['v4']);
            context['v15'] = Formula['+-'](context['v14'], context['0'], context['v13']);
            context['dyC2'] = Formula['*/'](context['v15'], context['1'], context['v4']);
            context['v16'] = Formula['+-'](context['x1I'], context['0'], context['dxC1']);
            context['v17'] = Formula['+-'](context['x1I'], context['0'], context['dxC2']);
            context['v18'] = Formula['+-'](context['y1I'], context['0'], context['dyC1']);
            context['v19'] = Formula['+-'](context['y1I'], context['0'], context['dyC2']);
            context['v20'] = Formula['mod'](context['v16'], context['v18'], context['0']);
            context['v21'] = Formula['mod'](context['v17'], context['v19'], context['0']);
            context['v22'] = Formula['+-'](context['v21'], context['0'], context['v20']);
            context['dxC'] = Formula['?:'](context['v22'], context['dxC1'], context['dxC2']);
            context['dyC'] = Formula['?:'](context['v22'], context['dyC1'], context['dyC2']);
            context['sdxC'] = Formula['*/'](context['dxC'], context['rw2'], context['rI']);
            context['sdyC'] = Formula['*/'](context['dyC'], context['rh2'], context['rI']);
            context['xC'] = Formula['+-'](context['hc'], context['sdxC'], context['0']);
            context['yC'] = Formula['+-'](context['vc'], context['sdyC'], context['0']);
            context['ist0'] = Formula['at2'](context['sdxC'], context['sdyC']);
            context['ist1'] = Formula['+-'](context['ist0'], context['21600000'], context['0']);
            context['istAng'] = Formula['?:'](context['ist0'], context['ist0'], context['ist1']);
            context['isw1'] = Formula['+-'](context['stAng'], context['0'], context['istAng']);
            context['isw2'] = Formula['+-'](context['isw1'], context['0'], context['21600000']);
            context['iswAng'] = Formula['?:'](context['isw1'], context['isw2'], context['isw1']);
            context['p1'] = Formula['+-'](context['xF'], context['0'], context['xC']);
            context['p2'] = Formula['+-'](context['yF'], context['0'], context['yC']);
            context['p3'] = Formula['mod'](context['p1'], context['p2'], context['0']);
            context['p4'] = Formula['*/'](context['p3'], context['1'], context['2']);
            context['p5'] = Formula['+-'](context['p4'], context['0'], context['thh']);
            context['xGp'] = Formula['?:'](context['p5'], context['xF'], context['xG']);
            context['yGp'] = Formula['?:'](context['p5'], context['yF'], context['yG']);
            context['xBp'] = Formula['?:'](context['p5'], context['xC'], context['xB']);
            context['yBp'] = Formula['?:'](context['p5'], context['yC'], context['yB']);
            context['en0'] = Formula['at2'](context['sdxF'], context['sdyF']);
            context['en1'] = Formula['+-'](context['en0'], context['21600000'], context['0']);
            context['en2'] = Formula['?:'](context['en0'], context['en0'], context['en1']);
            context['sw0'] = Formula['+-'](context['en2'], context['0'], context['stAng']);
            context['sw1'] = Formula['+-'](context['sw0'], context['21600000'], context['0']);
            context['swAng'] = Formula['?:'](context['sw0'], context['sw0'], context['sw1']);
            context['wtI'] = Formula['sin'](context['rw3'], context['stAng']);
            context['htI'] = Formula['cos'](context['rh3'], context['stAng']);
            context['dxI'] = Formula['cat2'](context['rw3'], context['htI'], context['wtI']);
            context['dyI'] = Formula['sat2'](context['rh3'], context['htI'], context['wtI']);
            context['xI'] = Formula['+-'](context['hc'], context['dxI'], context['0']);
            context['yI'] = Formula['+-'](context['vc'], context['dyI'], context['0']);
            context['aI'] = Formula['+-'](context['stAng'], context['0'], context['cd4']);
            context['aA'] = Formula['+-'](context['ptAng'], context['cd4'], context['0']);
            context['aB'] = Formula['+-'](context['ptAng'], context['cd2'], context['0']);
            context['idx'] = Formula['cos'](context['rw1'], context['2700000']);
            context['idy'] = Formula['sin'](context['rh1'], context['2700000']);
            context['il'] = Formula['+-'](context['hc'], context['0'], context['idx']);
            context['ir'] = Formula['+-'](context['hc'], context['idx'], context['0']);
            context['it'] = Formula['+-'](context['vc'], context['0'], context['idy']);
            context['ib'] = Formula['+-'](context['vc'], context['idy'], context['0']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['xE'], context['yE'])} ${arcTo(
                            context,
                            context['rw1'],
                            context['rh1'],
                            context['stAng'],
                            context['swAng']
                        )} ${lineTo(context, context['xGp'], context['yGp'])} ${lineTo(
                            context,
                            context['xA'],
                            context['yA']
                        )} ${lineTo(context, context['xBp'], context['yBp'])} ${lineTo(
                            context,
                            context['xC'],
                            context['yC']
                        )} ${arcTo(
                            context,
                            context['rw2'],
                            context['rh2'],
                            context['istAng'],
                            context['iswAng']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.CLOUD]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            context['il'] = Formula['*/'](context['w'], context['2977'], context['21600']);
            context['it'] = Formula['*/'](context['h'], context['3262'], context['21600']);
            context['ir'] = Formula['*/'](context['w'], context['17087'], context['21600']);
            context['ib'] = Formula['*/'](context['h'], context['17337'], context['21600']);
            context['g27'] = Formula['*/'](context['w'], context['67'], context['21600']);
            context['g28'] = Formula['*/'](context['h'], context['21577'], context['21600']);
            context['g29'] = Formula['*/'](context['w'], context['21582'], context['21600']);
            context['g30'] = Formula['*/'](context['h'], context['1235'], context['21600']);

            return [
                {
                    d: path(context, { w: 43200, h: 43200 }, () => {
                        return `${moveTo(context, context['3900'], context['14370'])} ${arcTo(
                            context,
                            context['6753'],
                            context['9190'],
                            context['-11429249'],
                            context['7426832']
                        )} ${arcTo(
                            context,
                            context['5333'],
                            context['7267'],
                            context['-8646143'],
                            context['5396714']
                        )} ${arcTo(
                            context,
                            context['4365'],
                            context['5945'],
                            context['-8748475'],
                            context['5983381']
                        )} ${arcTo(
                            context,
                            context['4857'],
                            context['6595'],
                            context['-7859164'],
                            context['7034504']
                        )} ${arcTo(
                            context,
                            context['5333'],
                            context['7273'],
                            context['-4722533'],
                            context['6541615']
                        )} ${arcTo(
                            context,
                            context['6775'],
                            context['9220'],
                            context['-2776035'],
                            context['7816140']
                        )} ${arcTo(
                            context,
                            context['5785'],
                            context['7867'],
                            context['37501'],
                            context['6842000']
                        )} ${arcTo(
                            context,
                            context['6752'],
                            context['9215'],
                            context['1347096'],
                            context['6910353']
                        )} ${arcTo(
                            context,
                            context['7720'],
                            context['10543'],
                            context['3974558'],
                            context['4542661']
                        )} ${arcTo(
                            context,
                            context['4360'],
                            context['5918'],
                            context['-16496525'],
                            context['8804134']
                        )} ${arcTo(
                            context,
                            context['4345'],
                            context['5945'],
                            context['-14809710'],
                            context['9151131']
                        )} ${close(context)}`;
                    }),
                    attrs: { w: 43200, h: 43200 },
                    context,
                },
                {
                    d: path(
                        context,
                        { w: 43200, h: 43200, fill: 'none', extrusionOk: 'false' },
                        () => {
                            return `${moveTo(context, context['4693'], context['26177'])} ${arcTo(
                                context,
                                context['4345'],
                                context['5945'],
                                context['5204520'],
                                context['1585770']
                            )} ${moveTo(context, context['6928'], context['34899'])} ${arcTo(
                                context,
                                context['4360'],
                                context['5918'],
                                context['4416628'],
                                context['686848']
                            )} ${moveTo(context, context['16478'], context['39090'])} ${arcTo(
                                context,
                                context['6752'],
                                context['9215'],
                                context['8257449'],
                                context['844866']
                            )} ${moveTo(context, context['28827'], context['34751'])} ${arcTo(
                                context,
                                context['6752'],
                                context['9215'],
                                context['387196'],
                                context['959901']
                            )} ${moveTo(context, context['34129'], context['22954'])} ${arcTo(
                                context,
                                context['5785'],
                                context['7867'],
                                context['-4217541'],
                                context['4255042']
                            )} ${moveTo(context, context['41798'], context['15354'])} ${arcTo(
                                context,
                                context['5333'],
                                context['7273'],
                                context['1819082'],
                                context['1665090']
                            )} ${moveTo(context, context['38324'], context['5426'])} ${arcTo(
                                context,
                                context['4857'],
                                context['6595'],
                                context['-824660'],
                                context['891534']
                            )} ${moveTo(context, context['29078'], context['3952'])} ${arcTo(
                                context,
                                context['4857'],
                                context['6595'],
                                context['-8950887'],
                                context['1091722']
                            )} ${moveTo(context, context['22141'], context['4720'])} ${arcTo(
                                context,
                                context['4365'],
                                context['5945'],
                                context['-9809656'],
                                context['1061181']
                            )} ${moveTo(context, context['14000'], context['5192'])} ${arcTo(
                                context,
                                context['6753'],
                                context['9190'],
                                context['-4002417'],
                                context['739161']
                            )} ${moveTo(context, context['4127'], context['15789'])} ${arcTo(
                                context,
                                context['6753'],
                                context['9190'],
                                context['9459261'],
                                context['711490']
                            )}`;
                        }
                    ),
                    attrs: { w: 43200, h: 43200, fill: 'none', extrusionOk: 'false' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.CLOUD_CALLOUT]: {
        editable: true,
        defaultValue: [-20833, 62500],
        defaultKey: ['adj1', 'adj2'],
        formula: (width: number, height: number, [adj1, adj2]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;

            context['dxPos'] = Formula['*/'](context['w'], context['adj1'], context['100000']);
            context['dyPos'] = Formula['*/'](context['h'], context['adj2'], context['100000']);
            context['xPos'] = Formula['+-'](context['hc'], context['dxPos'], context['0']);
            context['yPos'] = Formula['+-'](context['vc'], context['dyPos'], context['0']);
            context['ht'] = Formula['cat2'](context['hd2'], context['dxPos'], context['dyPos']);
            context['wt'] = Formula['sat2'](context['wd2'], context['dxPos'], context['dyPos']);
            context['g2'] = Formula['cat2'](context['wd2'], context['ht'], context['wt']);
            context['g3'] = Formula['sat2'](context['hd2'], context['ht'], context['wt']);
            context['g4'] = Formula['+-'](context['hc'], context['g2'], context['0']);
            context['g5'] = Formula['+-'](context['vc'], context['g3'], context['0']);
            context['g6'] = Formula['+-'](context['g4'], context['0'], context['xPos']);
            context['g7'] = Formula['+-'](context['g5'], context['0'], context['yPos']);
            context['g8'] = Formula['mod'](context['g6'], context['g7'], context['0']);
            context['g9'] = Formula['*/'](context['ss'], context['6600'], context['21600']);
            context['g10'] = Formula['+-'](context['g8'], context['0'], context['g9']);
            context['g11'] = Formula['*/'](context['g10'], context['1'], context['3']);
            context['g12'] = Formula['*/'](context['ss'], context['1800'], context['21600']);
            context['g13'] = Formula['+-'](context['g11'], context['g12'], context['0']);
            context['g14'] = Formula['*/'](context['g13'], context['g6'], context['g8']);
            context['g15'] = Formula['*/'](context['g13'], context['g7'], context['g8']);
            context['g16'] = Formula['+-'](context['g14'], context['xPos'], context['0']);
            context['g17'] = Formula['+-'](context['g15'], context['yPos'], context['0']);
            context['g18'] = Formula['*/'](context['ss'], context['4800'], context['21600']);
            context['g19'] = Formula['*/'](context['g11'], context['2'], context['1']);
            context['g20'] = Formula['+-'](context['g18'], context['g19'], context['0']);
            context['g21'] = Formula['*/'](context['g20'], context['g6'], context['g8']);
            context['g22'] = Formula['*/'](context['g20'], context['g7'], context['g8']);
            context['g23'] = Formula['+-'](context['g21'], context['xPos'], context['0']);
            context['g24'] = Formula['+-'](context['g22'], context['yPos'], context['0']);
            context['g25'] = Formula['*/'](context['ss'], context['1200'], context['21600']);
            context['g26'] = Formula['*/'](context['ss'], context['600'], context['21600']);
            context['x23'] = Formula['+-'](context['xPos'], context['g26'], context['0']);
            context['x24'] = Formula['+-'](context['g16'], context['g25'], context['0']);
            context['x25'] = Formula['+-'](context['g23'], context['g12'], context['0']);
            context['il'] = Formula['*/'](context['w'], context['2977'], context['21600']);
            context['it'] = Formula['*/'](context['h'], context['3262'], context['21600']);
            context['ir'] = Formula['*/'](context['w'], context['17087'], context['21600']);
            context['ib'] = Formula['*/'](context['h'], context['17337'], context['21600']);
            context['g27'] = Formula['*/'](context['w'], context['67'], context['21600']);
            context['g28'] = Formula['*/'](context['h'], context['21577'], context['21600']);
            context['g29'] = Formula['*/'](context['w'], context['21582'], context['21600']);
            context['g30'] = Formula['*/'](context['h'], context['1235'], context['21600']);
            context['pang'] = Formula['at2'](context['dxPos'], context['dyPos']);

            return [
                {
                    d: path(context, { w: 43200, h: 43200 }, () => {
                        return `${moveTo(context, context['3900'], context['14370'])} ${arcTo(
                            context,
                            context['6753'],
                            context['9190'],
                            context['-11429249'],
                            context['7426832']
                        )} ${arcTo(
                            context,
                            context['5333'],
                            context['7267'],
                            context['-8646143'],
                            context['5396714']
                        )} ${arcTo(
                            context,
                            context['4365'],
                            context['5945'],
                            context['-8748475'],
                            context['5983381']
                        )} ${arcTo(
                            context,
                            context['4857'],
                            context['6595'],
                            context['-7859164'],
                            context['7034504']
                        )} ${arcTo(
                            context,
                            context['5333'],
                            context['7273'],
                            context['-4722533'],
                            context['6541615']
                        )} ${arcTo(
                            context,
                            context['6775'],
                            context['9220'],
                            context['-2776035'],
                            context['7816140']
                        )} ${arcTo(
                            context,
                            context['5785'],
                            context['7867'],
                            context['37501'],
                            context['6842000']
                        )} ${arcTo(
                            context,
                            context['6752'],
                            context['9215'],
                            context['1347096'],
                            context['6910353']
                        )} ${arcTo(
                            context,
                            context['7720'],
                            context['10543'],
                            context['3974558'],
                            context['4542661']
                        )} ${arcTo(
                            context,
                            context['4360'],
                            context['5918'],
                            context['-16496525'],
                            context['8804134']
                        )} ${arcTo(
                            context,
                            context['4345'],
                            context['5945'],
                            context['-14809710'],
                            context['9151131']
                        )} ${close(context)}`;
                    }),
                    attrs: { w: 43200, h: 43200 },
                    context,
                },
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['x23'], context['yPos'])} ${arcTo(
                            context,
                            context['g26'],
                            context['g26'],
                            context['0'],
                            context['21600000']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['x24'], context['g17'])} ${arcTo(
                            context,
                            context['g25'],
                            context['g25'],
                            context['0'],
                            context['21600000']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['x25'], context['g24'])} ${arcTo(
                            context,
                            context['g12'],
                            context['g12'],
                            context['0'],
                            context['21600000']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
                {
                    d: path(
                        context,
                        { w: 43200, h: 43200, fill: 'none', extrusionOk: 'false' },
                        () => {
                            return `${moveTo(context, context['4693'], context['26177'])} ${arcTo(
                                context,
                                context['4345'],
                                context['5945'],
                                context['5204520'],
                                context['1585770']
                            )} ${moveTo(context, context['6928'], context['34899'])} ${arcTo(
                                context,
                                context['4360'],
                                context['5918'],
                                context['4416628'],
                                context['686848']
                            )} ${moveTo(context, context['16478'], context['39090'])} ${arcTo(
                                context,
                                context['6752'],
                                context['9215'],
                                context['8257449'],
                                context['844866']
                            )} ${moveTo(context, context['28827'], context['34751'])} ${arcTo(
                                context,
                                context['6752'],
                                context['9215'],
                                context['387196'],
                                context['959901']
                            )} ${moveTo(context, context['34129'], context['22954'])} ${arcTo(
                                context,
                                context['5785'],
                                context['7867'],
                                context['-4217541'],
                                context['4255042']
                            )} ${moveTo(context, context['41798'], context['15354'])} ${arcTo(
                                context,
                                context['5333'],
                                context['7273'],
                                context['1819082'],
                                context['1665090']
                            )} ${moveTo(context, context['38324'], context['5426'])} ${arcTo(
                                context,
                                context['4857'],
                                context['6595'],
                                context['-824660'],
                                context['891534']
                            )} ${moveTo(context, context['29078'], context['3952'])} ${arcTo(
                                context,
                                context['4857'],
                                context['6595'],
                                context['-8950887'],
                                context['1091722']
                            )} ${moveTo(context, context['22141'], context['4720'])} ${arcTo(
                                context,
                                context['4365'],
                                context['5945'],
                                context['-9809656'],
                                context['1061181']
                            )} ${moveTo(context, context['14000'], context['5192'])} ${arcTo(
                                context,
                                context['6753'],
                                context['9190'],
                                context['-4002417'],
                                context['739161']
                            )} ${moveTo(context, context['4127'], context['15789'])} ${arcTo(
                                context,
                                context['6753'],
                                context['9190'],
                                context['9459261'],
                                context['711490']
                            )}`;
                        }
                    ),
                    attrs: { w: 43200, h: 43200, fill: 'none', extrusionOk: 'false' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.CORNER]: {
        editable: true,
        defaultValue: [50000, 50000],
        defaultKey: ['adj1', 'adj2'],
        formula: (width: number, height: number, [adj1, adj2]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;

            context['maxAdj1'] = Formula['*/'](context['100000'], context['h'], context['ss']);
            context['maxAdj2'] = Formula['*/'](context['100000'], context['w'], context['ss']);
            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['maxAdj1']);
            context['a2'] = Formula['pin'](context['0'], context['adj2'], context['maxAdj2']);
            context['x1'] = Formula['*/'](context['ss'], context['a2'], context['100000']);
            context['dy1'] = Formula['*/'](context['ss'], context['a1'], context['100000']);
            context['y1'] = Formula['+-'](context['b'], context['0'], context['dy1']);
            context['cx1'] = Formula['*/'](context['x1'], context['1'], context['2']);
            context['cy1'] = Formula['+/'](context['y1'], context['b'], context['2']);
            context['d'] = Formula['+-'](context['w'], context['0'], context['h']);
            context['it'] = Formula['?:'](context['d'], context['y1'], context['t']);
            context['ir'] = Formula['?:'](context['d'], context['r'], context['x1']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['x1'],
                            context['t']
                        )} ${lineTo(context, context['x1'], context['y1'])} ${lineTo(
                            context,
                            context['r'],
                            context['y1']
                        )} ${lineTo(context, context['r'], context['b'])} ${lineTo(
                            context,
                            context['l'],
                            context['b']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.CORNER_TABS]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            context['md'] = Formula['mod'](context['w'], context['h'], context['0']);
            context['dx'] = Formula['*/'](context['1'], context['md'], context['20']);
            context['y1'] = Formula['+-'](context['0'], context['b'], context['dx']);
            context['x1'] = Formula['+-'](context['0'], context['r'], context['dx']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['dx'],
                            context['t']
                        )} ${lineTo(context, context['l'], context['dx'])} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['y1'])} ${lineTo(
                            context,
                            context['dx'],
                            context['b']
                        )} ${lineTo(context, context['l'], context['b'])} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['x1'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['dx'])} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['r'], context['y1'])} ${lineTo(
                            context,
                            context['r'],
                            context['b']
                        )} ${lineTo(context, context['x1'], context['b'])} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.CUBE]: {
        editable: true,
        defaultValue: [25000],
        defaultKey: ['adj'],
        formula: (width: number, height: number, [adj]: number[]) => {
            const context = getContext(width, height);
            context['adj'] = adj;

            context['a'] = Formula['pin'](context['0'], context['adj'], context['100000']);
            context['y1'] = Formula['*/'](context['ss'], context['a'], context['100000']);
            context['y4'] = Formula['+-'](context['b'], context['0'], context['y1']);
            context['y2'] = Formula['*/'](context['y4'], context['1'], context['2']);
            context['y3'] = Formula['+/'](context['y1'], context['b'], context['2']);
            context['x4'] = Formula['+-'](context['r'], context['0'], context['y1']);
            context['x2'] = Formula['*/'](context['x4'], context['1'], context['2']);
            context['x3'] = Formula['+/'](context['y1'], context['r'], context['2']);

            return [
                {
                    d: path(context, { stroke: 'false', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['l'], context['y1'])} ${lineTo(
                            context,
                            context['x4'],
                            context['y1']
                        )} ${lineTo(context, context['x4'], context['b'])} ${lineTo(
                            context,
                            context['l'],
                            context['b']
                        )} ${close(context)}`;
                    }),
                    attrs: { stroke: 'false', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(
                        context,
                        { stroke: 'false', fill: 'darkenLess', extrusionOk: 'false' },
                        () => {
                            return `${moveTo(context, context['x4'], context['y1'])} ${lineTo(
                                context,
                                context['r'],
                                context['t']
                            )} ${lineTo(context, context['r'], context['y4'])} ${lineTo(
                                context,
                                context['x4'],
                                context['b']
                            )} ${close(context)}`;
                        }
                    ),
                    attrs: { stroke: 'false', fill: 'darkenLess', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(
                        context,
                        { stroke: 'false', fill: 'lightenLess', extrusionOk: 'false' },
                        () => {
                            return `${moveTo(context, context['l'], context['y1'])} ${lineTo(
                                context,
                                context['y1'],
                                context['t']
                            )} ${lineTo(context, context['r'], context['t'])} ${lineTo(
                                context,
                                context['x4'],
                                context['y1']
                            )} ${close(context)}`;
                        }
                    ),
                    attrs: { stroke: 'false', fill: 'lightenLess', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['l'], context['y1'])} ${lineTo(
                            context,
                            context['y1'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['y4']
                        )} ${lineTo(context, context['x4'], context['b'])} ${lineTo(
                            context,
                            context['l'],
                            context['b']
                        )} ${close(context)} ${moveTo(
                            context,
                            context['l'],
                            context['y1']
                        )} ${lineTo(context, context['x4'], context['y1'])} ${lineTo(
                            context,
                            context['r'],
                            context['t']
                        )} ${moveTo(context, context['x4'], context['y1'])} ${lineTo(
                            context,
                            context['x4'],
                            context['b']
                        )}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.CURVED_CONNECTOR2]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            return [
                {
                    d: path(context, { fill: 'none' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${cubicBezTo(
                            context,
                            context['wd2'],
                            context['t'],
                            context['r'],
                            context['hd2'],
                            context['r'],
                            context['b']
                        )}`;
                    }),
                    attrs: { fill: 'none' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.CURVED_CONNECTOR3]: {
        editable: true,
        defaultValue: [50000],
        defaultKey: ['adj1'],
        formula: (width: number, height: number, [adj1]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;

            context['x2'] = Formula['*/'](context['w'], context['adj1'], context['100000']);
            context['x1'] = Formula['+/'](context['l'], context['x2'], context['2']);
            context['x3'] = Formula['+/'](context['r'], context['x2'], context['2']);
            context['y3'] = Formula['*/'](context['h'], context['3'], context['4']);

            return [
                {
                    d: path(context, { fill: 'none' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${cubicBezTo(
                            context,
                            context['x1'],
                            context['t'],
                            context['x2'],
                            context['hd4'],
                            context['x2'],
                            context['vc']
                        )} ${cubicBezTo(
                            context,
                            context['x2'],
                            context['y3'],
                            context['x3'],
                            context['b'],
                            context['r'],
                            context['b']
                        )}`;
                    }),
                    attrs: { fill: 'none' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.CURVED_CONNECTOR4]: {
        editable: true,
        defaultValue: [50000, 50000],
        defaultKey: ['adj1', 'adj2'],
        formula: (width: number, height: number, [adj1, adj2]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;

            context['x2'] = Formula['*/'](context['w'], context['adj1'], context['100000']);
            context['x1'] = Formula['+/'](context['l'], context['x2'], context['2']);
            context['x3'] = Formula['+/'](context['r'], context['x2'], context['2']);
            context['x4'] = Formula['+/'](context['x2'], context['x3'], context['2']);
            context['x5'] = Formula['+/'](context['x3'], context['r'], context['2']);
            context['y4'] = Formula['*/'](context['h'], context['adj2'], context['100000']);
            context['y1'] = Formula['+/'](context['t'], context['y4'], context['2']);
            context['y2'] = Formula['+/'](context['t'], context['y1'], context['2']);
            context['y3'] = Formula['+/'](context['y1'], context['y4'], context['2']);
            context['y5'] = Formula['+/'](context['b'], context['y4'], context['2']);

            return [
                {
                    d: path(context, { fill: 'none' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${cubicBezTo(
                            context,
                            context['x1'],
                            context['t'],
                            context['x2'],
                            context['y2'],
                            context['x2'],
                            context['y1']
                        )} ${cubicBezTo(
                            context,
                            context['x2'],
                            context['y3'],
                            context['x4'],
                            context['y4'],
                            context['x3'],
                            context['y4']
                        )} ${cubicBezTo(
                            context,
                            context['x5'],
                            context['y4'],
                            context['r'],
                            context['y5'],
                            context['r'],
                            context['b']
                        )}`;
                    }),
                    attrs: { fill: 'none' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.CURVED_CONNECTOR5]: {
        editable: true,
        defaultValue: [50000, 50000, 50000],
        defaultKey: ['adj1', 'adj2', 'adj3'],
        formula: (width: number, height: number, [adj1, adj2, adj3]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;
            context['adj3'] = adj3;

            context['x3'] = Formula['*/'](context['w'], context['adj1'], context['100000']);
            context['x6'] = Formula['*/'](context['w'], context['adj3'], context['100000']);
            context['x1'] = Formula['+/'](context['x3'], context['x6'], context['2']);
            context['x2'] = Formula['+/'](context['l'], context['x3'], context['2']);
            context['x4'] = Formula['+/'](context['x3'], context['x1'], context['2']);
            context['x5'] = Formula['+/'](context['x6'], context['x1'], context['2']);
            context['x7'] = Formula['+/'](context['x6'], context['r'], context['2']);
            context['y4'] = Formula['*/'](context['h'], context['adj2'], context['100000']);
            context['y1'] = Formula['+/'](context['t'], context['y4'], context['2']);
            context['y2'] = Formula['+/'](context['t'], context['y1'], context['2']);
            context['y3'] = Formula['+/'](context['y1'], context['y4'], context['2']);
            context['y5'] = Formula['+/'](context['b'], context['y4'], context['2']);
            context['y6'] = Formula['+/'](context['y5'], context['y4'], context['2']);
            context['y7'] = Formula['+/'](context['y5'], context['b'], context['2']);

            return [
                {
                    d: path(context, { fill: 'none' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${cubicBezTo(
                            context,
                            context['x2'],
                            context['t'],
                            context['x3'],
                            context['y2'],
                            context['x3'],
                            context['y1']
                        )} ${cubicBezTo(
                            context,
                            context['x3'],
                            context['y3'],
                            context['x4'],
                            context['y4'],
                            context['x1'],
                            context['y4']
                        )} ${cubicBezTo(
                            context,
                            context['x5'],
                            context['y4'],
                            context['x6'],
                            context['y6'],
                            context['x6'],
                            context['y5']
                        )} ${cubicBezTo(
                            context,
                            context['x6'],
                            context['y7'],
                            context['x7'],
                            context['b'],
                            context['r'],
                            context['b']
                        )}`;
                    }),
                    attrs: { fill: 'none' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.CURVED_DOWN_ARROW]: {
        editable: true,
        defaultValue: [25000, 50000, 25000],
        defaultKey: ['adj1', 'adj2', 'adj3'],
        formula: (width: number, height: number, [adj1, adj2, adj3]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;
            context['adj3'] = adj3;

            context['maxAdj2'] = Formula['*/'](context['50000'], context['w'], context['ss']);
            context['a2'] = Formula['pin'](context['0'], context['adj2'], context['maxAdj2']);
            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['100000']);
            context['th'] = Formula['*/'](context['ss'], context['a1'], context['100000']);
            context['aw'] = Formula['*/'](context['ss'], context['a2'], context['100000']);
            context['q1'] = Formula['+/'](context['th'], context['aw'], context['4']);
            context['wR'] = Formula['+-'](context['wd2'], context['0'], context['q1']);
            context['q7'] = Formula['*/'](context['wR'], context['2'], context['1']);
            context['q8'] = Formula['*/'](context['q7'], context['q7'], context['1']);
            context['q9'] = Formula['*/'](context['th'], context['th'], context['1']);
            context['q10'] = Formula['+-'](context['q8'], context['0'], context['q9']);
            context['q11'] = Formula['sqrt'](context['q10']);
            context['idy'] = Formula['*/'](context['q11'], context['h'], context['q7']);
            context['maxAdj3'] = Formula['*/'](context['100000'], context['idy'], context['ss']);
            context['a3'] = Formula['pin'](context['0'], context['adj3'], context['maxAdj3']);
            context['ah'] = Formula['*/'](context['ss'], context['adj3'], context['100000']);
            context['x3'] = Formula['+-'](context['wR'], context['th'], context['0']);
            context['q2'] = Formula['*/'](context['h'], context['h'], context['1']);
            context['q3'] = Formula['*/'](context['ah'], context['ah'], context['1']);
            context['q4'] = Formula['+-'](context['q2'], context['0'], context['q3']);
            context['q5'] = Formula['sqrt'](context['q4']);
            context['dx'] = Formula['*/'](context['q5'], context['wR'], context['h']);
            context['x5'] = Formula['+-'](context['wR'], context['dx'], context['0']);
            context['x7'] = Formula['+-'](context['x3'], context['dx'], context['0']);
            context['q6'] = Formula['+-'](context['aw'], context['0'], context['th']);
            context['dh'] = Formula['*/'](context['q6'], context['1'], context['2']);
            context['x4'] = Formula['+-'](context['x5'], context['0'], context['dh']);
            context['x8'] = Formula['+-'](context['x7'], context['dh'], context['0']);
            context['aw2'] = Formula['*/'](context['aw'], context['1'], context['2']);
            context['x6'] = Formula['+-'](context['r'], context['0'], context['aw2']);
            context['y1'] = Formula['+-'](context['b'], context['0'], context['ah']);
            context['swAng'] = Formula['at2'](context['ah'], context['dx']);
            context['mswAng'] = Formula['+-'](context['0'], context['0'], context['swAng']);
            context['iy'] = Formula['+-'](context['b'], context['0'], context['idy']);
            context['ix'] = Formula['+/'](context['wR'], context['x3'], context['2']);
            context['q12'] = Formula['*/'](context['th'], context['1'], context['2']);
            context['dang2'] = Formula['at2'](context['idy'], context['q12']);
            context['stAng'] = Formula['+-'](context['3cd4'], context['swAng'], context['0']);
            context['stAng2'] = Formula['+-'](context['3cd4'], context['0'], context['dang2']);
            context['swAng2'] = Formula['+-'](context['dang2'], context['0'], context['cd4']);
            context['swAng3'] = Formula['+-'](context['cd4'], context['dang2'], context['0']);

            return [
                {
                    d: path(context, { stroke: 'false', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['x6'], context['b'])} ${lineTo(
                            context,
                            context['x4'],
                            context['y1']
                        )} ${lineTo(context, context['x5'], context['y1'])} ${arcTo(
                            context,
                            context['wR'],
                            context['h'],
                            context['stAng'],
                            context['mswAng']
                        )} ${lineTo(context, context['x3'], context['t'])} ${arcTo(
                            context,
                            context['wR'],
                            context['h'],
                            context['3cd4'],
                            context['swAng']
                        )} ${lineTo(context, context['x8'], context['y1'])} ${close(context)}`;
                    }),
                    attrs: { stroke: 'false', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(
                        context,
                        { fill: 'darkenLess', stroke: 'false', extrusionOk: 'false' },
                        () => {
                            return `${moveTo(context, context['ix'], context['iy'])} ${arcTo(
                                context,
                                context['wR'],
                                context['h'],
                                context['stAng2'],
                                context['swAng2']
                            )} ${lineTo(context, context['l'], context['b'])} ${arcTo(
                                context,
                                context['wR'],
                                context['h'],
                                context['cd2'],
                                context['swAng3']
                            )} ${close(context)}`;
                        }
                    ),
                    attrs: { fill: 'darkenLess', stroke: 'false', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['ix'], context['iy'])} ${arcTo(
                            context,
                            context['wR'],
                            context['h'],
                            context['stAng2'],
                            context['swAng2']
                        )} ${lineTo(context, context['l'], context['b'])} ${arcTo(
                            context,
                            context['wR'],
                            context['h'],
                            context['cd2'],
                            context['cd4']
                        )} ${lineTo(context, context['x3'], context['t'])} ${arcTo(
                            context,
                            context['wR'],
                            context['h'],
                            context['3cd4'],
                            context['swAng']
                        )} ${lineTo(context, context['x8'], context['y1'])} ${lineTo(
                            context,
                            context['x6'],
                            context['b']
                        )} ${lineTo(context, context['x4'], context['y1'])} ${lineTo(
                            context,
                            context['x5'],
                            context['y1']
                        )} ${arcTo(
                            context,
                            context['wR'],
                            context['h'],
                            context['stAng'],
                            context['mswAng']
                        )}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.CURVED_LEFT_ARROW]: {
        editable: true,
        defaultValue: [25000, 50000, 25000],
        defaultKey: ['adj1', 'adj2', 'adj3'],
        formula: (width: number, height: number, [adj1, adj2, adj3]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;
            context['adj3'] = adj3;

            context['maxAdj2'] = Formula['*/'](context['50000'], context['h'], context['ss']);
            context['a2'] = Formula['pin'](context['0'], context['adj2'], context['maxAdj2']);
            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['a2']);
            context['th'] = Formula['*/'](context['ss'], context['a1'], context['100000']);
            context['aw'] = Formula['*/'](context['ss'], context['a2'], context['100000']);
            context['q1'] = Formula['+/'](context['th'], context['aw'], context['4']);
            context['hR'] = Formula['+-'](context['hd2'], context['0'], context['q1']);
            context['q7'] = Formula['*/'](context['hR'], context['2'], context['1']);
            context['q8'] = Formula['*/'](context['q7'], context['q7'], context['1']);
            context['q9'] = Formula['*/'](context['th'], context['th'], context['1']);
            context['q10'] = Formula['+-'](context['q8'], context['0'], context['q9']);
            context['q11'] = Formula['sqrt'](context['q10']);
            context['idx'] = Formula['*/'](context['q11'], context['w'], context['q7']);
            context['maxAdj3'] = Formula['*/'](context['100000'], context['idx'], context['ss']);
            context['a3'] = Formula['pin'](context['0'], context['adj3'], context['maxAdj3']);
            context['ah'] = Formula['*/'](context['ss'], context['a3'], context['100000']);
            context['y3'] = Formula['+-'](context['hR'], context['th'], context['0']);
            context['q2'] = Formula['*/'](context['w'], context['w'], context['1']);
            context['q3'] = Formula['*/'](context['ah'], context['ah'], context['1']);
            context['q4'] = Formula['+-'](context['q2'], context['0'], context['q3']);
            context['q5'] = Formula['sqrt'](context['q4']);
            context['dy'] = Formula['*/'](context['q5'], context['hR'], context['w']);
            context['y5'] = Formula['+-'](context['hR'], context['dy'], context['0']);
            context['y7'] = Formula['+-'](context['y3'], context['dy'], context['0']);
            context['q6'] = Formula['+-'](context['aw'], context['0'], context['th']);
            context['dh'] = Formula['*/'](context['q6'], context['1'], context['2']);
            context['y4'] = Formula['+-'](context['y5'], context['0'], context['dh']);
            context['y8'] = Formula['+-'](context['y7'], context['dh'], context['0']);
            context['aw2'] = Formula['*/'](context['aw'], context['1'], context['2']);
            context['y6'] = Formula['+-'](context['b'], context['0'], context['aw2']);
            context['x1'] = Formula['+-'](context['l'], context['ah'], context['0']);
            context['swAng'] = Formula['at2'](context['ah'], context['dy']);
            context['mswAng'] = Formula['+-'](context['0'], context['0'], context['swAng']);
            context['ix'] = Formula['+-'](context['l'], context['idx'], context['0']);
            context['iy'] = Formula['+/'](context['hR'], context['y3'], context['2']);
            context['q12'] = Formula['*/'](context['th'], context['1'], context['2']);
            context['dang2'] = Formula['at2'](context['idx'], context['q12']);
            context['swAng2'] = Formula['+-'](context['dang2'], context['0'], context['swAng']);
            context['swAng3'] = Formula['+-'](context['swAng'], context['dang2'], context['0']);
            context['stAng3'] = Formula['+-'](context['0'], context['0'], context['dang2']);

            return [
                {
                    d: path(context, { stroke: 'false', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['l'], context['y6'])} ${lineTo(
                            context,
                            context['x1'],
                            context['y4']
                        )} ${lineTo(context, context['x1'], context['y5'])} ${arcTo(
                            context,
                            context['w'],
                            context['hR'],
                            context['swAng'],
                            context['swAng2']
                        )} ${arcTo(
                            context,
                            context['w'],
                            context['hR'],
                            context['stAng3'],
                            context['swAng3']
                        )} ${lineTo(context, context['x1'], context['y8'])} ${close(context)}`;
                    }),
                    attrs: { stroke: 'false', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(
                        context,
                        { fill: 'darkenLess', stroke: 'false', extrusionOk: 'false' },
                        () => {
                            return `${moveTo(context, context['r'], context['y3'])} ${arcTo(
                                context,
                                context['w'],
                                context['hR'],
                                context['0'],
                                context['-5400000']
                            )} ${lineTo(context, context['l'], context['t'])} ${arcTo(
                                context,
                                context['w'],
                                context['hR'],
                                context['3cd4'],
                                context['cd4']
                            )} ${close(context)}`;
                        }
                    ),
                    attrs: { fill: 'darkenLess', stroke: 'false', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['r'], context['y3'])} ${arcTo(
                            context,
                            context['w'],
                            context['hR'],
                            context['0'],
                            context['-5400000']
                        )} ${lineTo(context, context['l'], context['t'])} ${arcTo(
                            context,
                            context['w'],
                            context['hR'],
                            context['3cd4'],
                            context['cd4']
                        )} ${lineTo(context, context['r'], context['y3'])} ${arcTo(
                            context,
                            context['w'],
                            context['hR'],
                            context['0'],
                            context['swAng']
                        )} ${lineTo(context, context['x1'], context['y8'])} ${lineTo(
                            context,
                            context['l'],
                            context['y6']
                        )} ${lineTo(context, context['x1'], context['y4'])} ${lineTo(
                            context,
                            context['x1'],
                            context['y5']
                        )} ${arcTo(
                            context,
                            context['w'],
                            context['hR'],
                            context['swAng'],
                            context['swAng2']
                        )}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.CURVED_RIGHT_ARROW]: {
        editable: true,
        defaultValue: [25000, 50000, 25000],
        defaultKey: ['adj1', 'adj2', 'adj3'],
        formula: (width: number, height: number, [adj1, adj2, adj3]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;
            context['adj3'] = adj3;

            context['maxAdj2'] = Formula['*/'](context['50000'], context['h'], context['ss']);
            context['a2'] = Formula['pin'](context['0'], context['adj2'], context['maxAdj2']);
            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['a2']);
            context['th'] = Formula['*/'](context['ss'], context['a1'], context['100000']);
            context['aw'] = Formula['*/'](context['ss'], context['a2'], context['100000']);
            context['q1'] = Formula['+/'](context['th'], context['aw'], context['4']);
            context['hR'] = Formula['+-'](context['hd2'], context['0'], context['q1']);
            context['q7'] = Formula['*/'](context['hR'], context['2'], context['1']);
            context['q8'] = Formula['*/'](context['q7'], context['q7'], context['1']);
            context['q9'] = Formula['*/'](context['th'], context['th'], context['1']);
            context['q10'] = Formula['+-'](context['q8'], context['0'], context['q9']);
            context['q11'] = Formula['sqrt'](context['q10']);
            context['idx'] = Formula['*/'](context['q11'], context['w'], context['q7']);
            context['maxAdj3'] = Formula['*/'](context['100000'], context['idx'], context['ss']);
            context['a3'] = Formula['pin'](context['0'], context['adj3'], context['maxAdj3']);
            context['ah'] = Formula['*/'](context['ss'], context['a3'], context['100000']);
            context['y3'] = Formula['+-'](context['hR'], context['th'], context['0']);
            context['q2'] = Formula['*/'](context['w'], context['w'], context['1']);
            context['q3'] = Formula['*/'](context['ah'], context['ah'], context['1']);
            context['q4'] = Formula['+-'](context['q2'], context['0'], context['q3']);
            context['q5'] = Formula['sqrt'](context['q4']);
            context['dy'] = Formula['*/'](context['q5'], context['hR'], context['w']);
            context['y5'] = Formula['+-'](context['hR'], context['dy'], context['0']);
            context['y7'] = Formula['+-'](context['y3'], context['dy'], context['0']);
            context['q6'] = Formula['+-'](context['aw'], context['0'], context['th']);
            context['dh'] = Formula['*/'](context['q6'], context['1'], context['2']);
            context['y4'] = Formula['+-'](context['y5'], context['0'], context['dh']);
            context['y8'] = Formula['+-'](context['y7'], context['dh'], context['0']);
            context['aw2'] = Formula['*/'](context['aw'], context['1'], context['2']);
            context['y6'] = Formula['+-'](context['b'], context['0'], context['aw2']);
            context['x1'] = Formula['+-'](context['r'], context['0'], context['ah']);
            context['swAng'] = Formula['at2'](context['ah'], context['dy']);
            context['stAng'] = Formula['+-'](context['cd2'], context['0'], context['swAng']);
            context['mswAng'] = Formula['+-'](context['0'], context['0'], context['swAng']);
            context['ix'] = Formula['+-'](context['r'], context['0'], context['idx']);
            context['iy'] = Formula['+/'](context['hR'], context['y3'], context['2']);
            context['q12'] = Formula['*/'](context['th'], context['1'], context['2']);
            context['dang2'] = Formula['at2'](context['idx'], context['q12']);
            context['swAng2'] = Formula['+-'](context['dang2'], context['0'], context['cd4']);
            context['swAng3'] = Formula['+-'](context['cd4'], context['dang2'], context['0']);
            context['stAng3'] = Formula['+-'](context['cd2'], context['0'], context['dang2']);

            return [
                {
                    d: path(context, { stroke: 'false', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['l'], context['hR'])} ${arcTo(
                            context,
                            context['w'],
                            context['hR'],
                            context['cd2'],
                            context['mswAng']
                        )} ${lineTo(context, context['x1'], context['y4'])} ${lineTo(
                            context,
                            context['r'],
                            context['y6']
                        )} ${lineTo(context, context['x1'], context['y8'])} ${lineTo(
                            context,
                            context['x1'],
                            context['y7']
                        )} ${arcTo(
                            context,
                            context['w'],
                            context['hR'],
                            context['stAng'],
                            context['swAng']
                        )} ${close(context)}`;
                    }),
                    attrs: { stroke: 'false', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(
                        context,
                        { fill: 'darkenLess', stroke: 'false', extrusionOk: 'false' },
                        () => {
                            return `${moveTo(context, context['r'], context['th'])} ${arcTo(
                                context,
                                context['w'],
                                context['hR'],
                                context['3cd4'],
                                context['swAng2']
                            )} ${arcTo(
                                context,
                                context['w'],
                                context['hR'],
                                context['stAng3'],
                                context['swAng3']
                            )} ${close(context)}`;
                        }
                    ),
                    attrs: { fill: 'darkenLess', stroke: 'false', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['l'], context['hR'])} ${arcTo(
                            context,
                            context['w'],
                            context['hR'],
                            context['cd2'],
                            context['mswAng']
                        )} ${lineTo(context, context['x1'], context['y4'])} ${lineTo(
                            context,
                            context['r'],
                            context['y6']
                        )} ${lineTo(context, context['x1'], context['y8'])} ${lineTo(
                            context,
                            context['x1'],
                            context['y7']
                        )} ${arcTo(
                            context,
                            context['w'],
                            context['hR'],
                            context['stAng'],
                            context['swAng']
                        )} ${lineTo(context, context['l'], context['hR'])} ${arcTo(
                            context,
                            context['w'],
                            context['hR'],
                            context['cd2'],
                            context['cd4']
                        )} ${lineTo(context, context['r'], context['th'])} ${arcTo(
                            context,
                            context['w'],
                            context['hR'],
                            context['3cd4'],
                            context['swAng2']
                        )}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.CURVED_UP_ARROW]: {
        editable: true,
        defaultValue: [25000, 50000, 25000],
        defaultKey: ['adj1', 'adj2', 'adj3'],
        formula: (width: number, height: number, [adj1, adj2, adj3]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;
            context['adj3'] = adj3;

            context['maxAdj2'] = Formula['*/'](context['50000'], context['w'], context['ss']);
            context['a2'] = Formula['pin'](context['0'], context['adj2'], context['maxAdj2']);
            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['100000']);
            context['th'] = Formula['*/'](context['ss'], context['a1'], context['100000']);
            context['aw'] = Formula['*/'](context['ss'], context['a2'], context['100000']);
            context['q1'] = Formula['+/'](context['th'], context['aw'], context['4']);
            context['wR'] = Formula['+-'](context['wd2'], context['0'], context['q1']);
            context['q7'] = Formula['*/'](context['wR'], context['2'], context['1']);
            context['q8'] = Formula['*/'](context['q7'], context['q7'], context['1']);
            context['q9'] = Formula['*/'](context['th'], context['th'], context['1']);
            context['q10'] = Formula['+-'](context['q8'], context['0'], context['q9']);
            context['q11'] = Formula['sqrt'](context['q10']);
            context['idy'] = Formula['*/'](context['q11'], context['h'], context['q7']);
            context['maxAdj3'] = Formula['*/'](context['100000'], context['idy'], context['ss']);
            context['a3'] = Formula['pin'](context['0'], context['adj3'], context['maxAdj3']);
            context['ah'] = Formula['*/'](context['ss'], context['adj3'], context['100000']);
            context['x3'] = Formula['+-'](context['wR'], context['th'], context['0']);
            context['q2'] = Formula['*/'](context['h'], context['h'], context['1']);
            context['q3'] = Formula['*/'](context['ah'], context['ah'], context['1']);
            context['q4'] = Formula['+-'](context['q2'], context['0'], context['q3']);
            context['q5'] = Formula['sqrt'](context['q4']);
            context['dx'] = Formula['*/'](context['q5'], context['wR'], context['h']);
            context['x5'] = Formula['+-'](context['wR'], context['dx'], context['0']);
            context['x7'] = Formula['+-'](context['x3'], context['dx'], context['0']);
            context['q6'] = Formula['+-'](context['aw'], context['0'], context['th']);
            context['dh'] = Formula['*/'](context['q6'], context['1'], context['2']);
            context['x4'] = Formula['+-'](context['x5'], context['0'], context['dh']);
            context['x8'] = Formula['+-'](context['x7'], context['dh'], context['0']);
            context['aw2'] = Formula['*/'](context['aw'], context['1'], context['2']);
            context['x6'] = Formula['+-'](context['r'], context['0'], context['aw2']);
            context['y1'] = Formula['+-'](context['t'], context['ah'], context['0']);
            context['swAng'] = Formula['at2'](context['ah'], context['dx']);
            context['mswAng'] = Formula['+-'](context['0'], context['0'], context['swAng']);
            context['iy'] = Formula['+-'](context['t'], context['idy'], context['0']);
            context['ix'] = Formula['+/'](context['wR'], context['x3'], context['2']);
            context['q12'] = Formula['*/'](context['th'], context['1'], context['2']);
            context['dang2'] = Formula['at2'](context['idy'], context['q12']);
            context['swAng2'] = Formula['+-'](context['dang2'], context['0'], context['swAng']);
            context['mswAng2'] = Formula['+-'](context['0'], context['0'], context['swAng2']);
            context['stAng3'] = Formula['+-'](context['cd4'], context['0'], context['swAng']);
            context['swAng3'] = Formula['+-'](context['swAng'], context['dang2'], context['0']);
            context['stAng2'] = Formula['+-'](context['cd4'], context['0'], context['dang2']);

            return [
                {
                    d: path(context, { stroke: 'false', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['x6'], context['t'])} ${lineTo(
                            context,
                            context['x8'],
                            context['y1']
                        )} ${lineTo(context, context['x7'], context['y1'])} ${arcTo(
                            context,
                            context['wR'],
                            context['h'],
                            context['stAng3'],
                            context['swAng3']
                        )} ${arcTo(
                            context,
                            context['wR'],
                            context['h'],
                            context['stAng2'],
                            context['swAng2']
                        )} ${lineTo(context, context['x4'], context['y1'])} ${close(context)}`;
                    }),
                    attrs: { stroke: 'false', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(
                        context,
                        { fill: 'darkenLess', stroke: 'false', extrusionOk: 'false' },
                        () => {
                            return `${moveTo(context, context['wR'], context['b'])} ${arcTo(
                                context,
                                context['wR'],
                                context['h'],
                                context['cd4'],
                                context['cd4']
                            )} ${lineTo(context, context['th'], context['t'])} ${arcTo(
                                context,
                                context['wR'],
                                context['h'],
                                context['cd2'],
                                context['-5400000']
                            )} ${close(context)}`;
                        }
                    ),
                    attrs: { fill: 'darkenLess', stroke: 'false', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['ix'], context['iy'])} ${arcTo(
                            context,
                            context['wR'],
                            context['h'],
                            context['stAng2'],
                            context['swAng2']
                        )} ${lineTo(context, context['x4'], context['y1'])} ${lineTo(
                            context,
                            context['x6'],
                            context['t']
                        )} ${lineTo(context, context['x8'], context['y1'])} ${lineTo(
                            context,
                            context['x7'],
                            context['y1']
                        )} ${arcTo(
                            context,
                            context['wR'],
                            context['h'],
                            context['stAng3'],
                            context['swAng']
                        )} ${lineTo(context, context['wR'], context['b'])} ${arcTo(
                            context,
                            context['wR'],
                            context['h'],
                            context['cd4'],
                            context['cd4']
                        )} ${lineTo(context, context['th'], context['t'])} ${arcTo(
                            context,
                            context['wR'],
                            context['h'],
                            context['cd2'],
                            context['-5400000']
                        )}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.DECAGON]: {
        editable: true,
        defaultValue: [105146],
        defaultKey: ['vf'],
        formula: (width: number, height: number, [vf]: number[]) => {
            const context = getContext(width, height);
            context['vf'] = vf;

            context['shd2'] = Formula['*/'](context['hd2'], context['vf'], context['100000']);
            context['dx1'] = Formula['cos'](context['wd2'], context['2160000']);
            context['dx2'] = Formula['cos'](context['wd2'], context['4320000']);
            context['x1'] = Formula['+-'](context['hc'], context['0'], context['dx1']);
            context['x2'] = Formula['+-'](context['hc'], context['0'], context['dx2']);
            context['x3'] = Formula['+-'](context['hc'], context['dx2'], context['0']);
            context['x4'] = Formula['+-'](context['hc'], context['dx1'], context['0']);
            context['dy1'] = Formula['sin'](context['shd2'], context['4320000']);
            context['dy2'] = Formula['sin'](context['shd2'], context['2160000']);
            context['y1'] = Formula['+-'](context['vc'], context['0'], context['dy1']);
            context['y2'] = Formula['+-'](context['vc'], context['0'], context['dy2']);
            context['y3'] = Formula['+-'](context['vc'], context['dy2'], context['0']);
            context['y4'] = Formula['+-'](context['vc'], context['dy1'], context['0']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['vc'])} ${lineTo(
                            context,
                            context['x1'],
                            context['y2']
                        )} ${lineTo(context, context['x2'], context['y1'])} ${lineTo(
                            context,
                            context['x3'],
                            context['y1']
                        )} ${lineTo(context, context['x4'], context['y2'])} ${lineTo(
                            context,
                            context['r'],
                            context['vc']
                        )} ${lineTo(context, context['x4'], context['y3'])} ${lineTo(
                            context,
                            context['x3'],
                            context['y4']
                        )} ${lineTo(context, context['x2'], context['y4'])} ${lineTo(
                            context,
                            context['x1'],
                            context['y3']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.DIAG_STRIPE]: {
        editable: true,
        defaultValue: [50000],
        defaultKey: ['adj'],
        formula: (width: number, height: number, [adj]: number[]) => {
            const context = getContext(width, height);
            context['adj'] = adj;

            context['a'] = Formula['pin'](context['0'], context['adj'], context['100000']);
            context['x2'] = Formula['*/'](context['w'], context['a'], context['100000']);
            context['x1'] = Formula['*/'](context['x2'], context['1'], context['2']);
            context['x3'] = Formula['+/'](context['x2'], context['r'], context['2']);
            context['y2'] = Formula['*/'](context['h'], context['a'], context['100000']);
            context['y1'] = Formula['*/'](context['y2'], context['1'], context['2']);
            context['y3'] = Formula['+/'](context['y2'], context['b'], context['2']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['y2'])} ${lineTo(
                            context,
                            context['x2'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['t'])} ${lineTo(
                            context,
                            context['l'],
                            context['b']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.DIAMOND]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            context['ir'] = Formula['*/'](context['w'], context['3'], context['4']);
            context['ib'] = Formula['*/'](context['h'], context['3'], context['4']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['vc'])} ${lineTo(
                            context,
                            context['hc'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['vc'])} ${lineTo(
                            context,
                            context['hc'],
                            context['b']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.DODECAGON]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            context['x1'] = Formula['*/'](context['w'], context['2894'], context['21600']);
            context['x2'] = Formula['*/'](context['w'], context['7906'], context['21600']);
            context['x3'] = Formula['*/'](context['w'], context['13694'], context['21600']);
            context['x4'] = Formula['*/'](context['w'], context['18706'], context['21600']);
            context['y1'] = Formula['*/'](context['h'], context['2894'], context['21600']);
            context['y2'] = Formula['*/'](context['h'], context['7906'], context['21600']);
            context['y3'] = Formula['*/'](context['h'], context['13694'], context['21600']);
            context['y4'] = Formula['*/'](context['h'], context['18706'], context['21600']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['y2'])} ${lineTo(
                            context,
                            context['x1'],
                            context['y1']
                        )} ${lineTo(context, context['x2'], context['t'])} ${lineTo(
                            context,
                            context['x3'],
                            context['t']
                        )} ${lineTo(context, context['x4'], context['y1'])} ${lineTo(
                            context,
                            context['r'],
                            context['y2']
                        )} ${lineTo(context, context['r'], context['y3'])} ${lineTo(
                            context,
                            context['x4'],
                            context['y4']
                        )} ${lineTo(context, context['x3'], context['b'])} ${lineTo(
                            context,
                            context['x2'],
                            context['b']
                        )} ${lineTo(context, context['x1'], context['y4'])} ${lineTo(
                            context,
                            context['l'],
                            context['y3']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.DONUT]: {
        editable: true,
        defaultValue: [25000],
        defaultKey: ['adj'],
        formula: (width: number, height: number, [adj]: number[]) => {
            const context = getContext(width, height);
            context['adj'] = adj;

            context['a'] = Formula['pin'](context['0'], context['adj'], context['50000']);
            context['dr'] = Formula['*/'](context['ss'], context['a'], context['100000']);
            context['iwd2'] = Formula['+-'](context['wd2'], context['0'], context['dr']);
            context['ihd2'] = Formula['+-'](context['hd2'], context['0'], context['dr']);
            context['idx'] = Formula['cos'](context['wd2'], context['2700000']);
            context['idy'] = Formula['sin'](context['hd2'], context['2700000']);
            context['il'] = Formula['+-'](context['hc'], context['0'], context['idx']);
            context['ir'] = Formula['+-'](context['hc'], context['idx'], context['0']);
            context['it'] = Formula['+-'](context['vc'], context['0'], context['idy']);
            context['ib'] = Formula['+-'](context['vc'], context['idy'], context['0']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['vc'])} ${arcTo(
                            context,
                            context['wd2'],
                            context['hd2'],
                            context['cd2'],
                            context['cd4']
                        )} ${arcTo(
                            context,
                            context['wd2'],
                            context['hd2'],
                            context['3cd4'],
                            context['cd4']
                        )} ${arcTo(
                            context,
                            context['wd2'],
                            context['hd2'],
                            context['0'],
                            context['cd4']
                        )} ${arcTo(
                            context,
                            context['wd2'],
                            context['hd2'],
                            context['cd4'],
                            context['cd4']
                        )} ${close(context)} ${moveTo(
                            context,
                            context['dr'],
                            context['vc']
                        )} ${arcTo(
                            context,
                            context['iwd2'],
                            context['ihd2'],
                            context['cd2'],
                            context['-5400000']
                        )} ${arcTo(
                            context,
                            context['iwd2'],
                            context['ihd2'],
                            context['cd4'],
                            context['-5400000']
                        )} ${arcTo(
                            context,
                            context['iwd2'],
                            context['ihd2'],
                            context['0'],
                            context['-5400000']
                        )} ${arcTo(
                            context,
                            context['iwd2'],
                            context['ihd2'],
                            context['3cd4'],
                            context['-5400000']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.DOUBLE_WAVE]: {
        editable: true,
        defaultValue: [6250, 0],
        defaultKey: ['adj1', 'adj2'],
        formula: (width: number, height: number, [adj1, adj2]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;

            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['12500']);
            context['a2'] = Formula['pin'](context['-10000'], context['adj2'], context['10000']);
            context['y1'] = Formula['*/'](context['h'], context['a1'], context['100000']);
            context['dy2'] = Formula['*/'](context['y1'], context['10'], context['3']);
            context['y2'] = Formula['+-'](context['y1'], context['0'], context['dy2']);
            context['y3'] = Formula['+-'](context['y1'], context['dy2'], context['0']);
            context['y4'] = Formula['+-'](context['b'], context['0'], context['y1']);
            context['y5'] = Formula['+-'](context['y4'], context['0'], context['dy2']);
            context['y6'] = Formula['+-'](context['y4'], context['dy2'], context['0']);
            context['dx1'] = Formula['*/'](context['w'], context['a2'], context['100000']);
            context['of2'] = Formula['*/'](context['w'], context['a2'], context['50000']);
            context['x1'] = Formula['abs'](context['dx1']);
            context['dx2'] = Formula['?:'](context['of2'], context['0'], context['of2']);
            context['x2'] = Formula['+-'](context['l'], context['0'], context['dx2']);
            context['dx8'] = Formula['?:'](context['of2'], context['of2'], context['0']);
            context['x8'] = Formula['+-'](context['r'], context['0'], context['dx8']);
            context['dx3'] = Formula['+/'](context['dx2'], context['x8'], context['6']);
            context['x3'] = Formula['+-'](context['x2'], context['dx3'], context['0']);
            context['dx4'] = Formula['+/'](context['dx2'], context['x8'], context['3']);
            context['x4'] = Formula['+-'](context['x2'], context['dx4'], context['0']);
            context['x5'] = Formula['+/'](context['x2'], context['x8'], context['2']);
            context['x6'] = Formula['+-'](context['x5'], context['dx3'], context['0']);
            context['x7'] = Formula['+/'](context['x6'], context['x8'], context['2']);
            context['x9'] = Formula['+-'](context['l'], context['dx8'], context['0']);
            context['x15'] = Formula['+-'](context['r'], context['dx2'], context['0']);
            context['x10'] = Formula['+-'](context['x9'], context['dx3'], context['0']);
            context['x11'] = Formula['+-'](context['x9'], context['dx4'], context['0']);
            context['x12'] = Formula['+/'](context['x9'], context['x15'], context['2']);
            context['x13'] = Formula['+-'](context['x12'], context['dx3'], context['0']);
            context['x14'] = Formula['+/'](context['x13'], context['x15'], context['2']);
            context['x16'] = Formula['+-'](context['r'], context['0'], context['x1']);
            context['xAdj'] = Formula['+-'](context['hc'], context['dx1'], context['0']);
            context['il'] = Formula['max'](context['x2'], context['x9']);
            context['ir'] = Formula['min'](context['x8'], context['x15']);
            context['it'] = Formula['*/'](context['h'], context['a1'], context['50000']);
            context['ib'] = Formula['+-'](context['b'], context['0'], context['it']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['x2'], context['y1'])} ${cubicBezTo(
                            context,
                            context['x3'],
                            context['y2'],
                            context['x4'],
                            context['y3'],
                            context['x5'],
                            context['y1']
                        )} ${cubicBezTo(
                            context,
                            context['x6'],
                            context['y2'],
                            context['x7'],
                            context['y3'],
                            context['x8'],
                            context['y1']
                        )} ${lineTo(context, context['x15'], context['y4'])} ${cubicBezTo(
                            context,
                            context['x14'],
                            context['y6'],
                            context['x13'],
                            context['y5'],
                            context['x12'],
                            context['y4']
                        )} ${cubicBezTo(
                            context,
                            context['x11'],
                            context['y6'],
                            context['x10'],
                            context['y5'],
                            context['x9'],
                            context['y4']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.DOWN_ARROW]: {
        editable: true,
        defaultValue: [50000, 50000],
        defaultKey: ['adj1', 'adj2'],
        formula: (width: number, height: number, [adj1, adj2]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;

            context['maxAdj2'] = Formula['*/'](context['100000'], context['h'], context['ss']);
            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['100000']);
            context['a2'] = Formula['pin'](context['0'], context['adj2'], context['maxAdj2']);
            context['dy1'] = Formula['*/'](context['ss'], context['a2'], context['100000']);
            context['y1'] = Formula['+-'](context['b'], context['0'], context['dy1']);
            context['dx1'] = Formula['*/'](context['w'], context['a1'], context['200000']);
            context['x1'] = Formula['+-'](context['hc'], context['0'], context['dx1']);
            context['x2'] = Formula['+-'](context['hc'], context['dx1'], context['0']);
            context['dy2'] = Formula['*/'](context['x1'], context['dy1'], context['wd2']);
            context['y2'] = Formula['+-'](context['y1'], context['dy2'], context['0']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['y1'])} ${lineTo(
                            context,
                            context['x1'],
                            context['y1']
                        )} ${lineTo(context, context['x1'], context['t'])} ${lineTo(
                            context,
                            context['x2'],
                            context['t']
                        )} ${lineTo(context, context['x2'], context['y1'])} ${lineTo(
                            context,
                            context['r'],
                            context['y1']
                        )} ${lineTo(context, context['hc'], context['b'])} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.DOWN_ARROW_CALLOUT]: {
        editable: true,
        defaultValue: [25000, 25000, 25000, 64977],
        defaultKey: ['adj1', 'adj2', 'adj3', 'adj4'],
        formula: (width: number, height: number, [adj1, adj2, adj3, adj4]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;
            context['adj3'] = adj3;
            context['adj4'] = adj4;

            context['maxAdj2'] = Formula['*/'](context['50000'], context['w'], context['ss']);
            context['a2'] = Formula['pin'](context['0'], context['adj2'], context['maxAdj2']);
            context['maxAdj1'] = Formula['*/'](context['a2'], context['2'], context['1']);
            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['maxAdj1']);
            context['maxAdj3'] = Formula['*/'](context['100000'], context['h'], context['ss']);
            context['a3'] = Formula['pin'](context['0'], context['adj3'], context['maxAdj3']);
            context['q2'] = Formula['*/'](context['a3'], context['ss'], context['h']);
            context['maxAdj4'] = Formula['+-'](context['100000'], context['0'], context['q2']);
            context['a4'] = Formula['pin'](context['0'], context['adj4'], context['maxAdj4']);
            context['dx1'] = Formula['*/'](context['ss'], context['a2'], context['100000']);
            context['dx2'] = Formula['*/'](context['ss'], context['a1'], context['200000']);
            context['x1'] = Formula['+-'](context['hc'], context['0'], context['dx1']);
            context['x2'] = Formula['+-'](context['hc'], context['0'], context['dx2']);
            context['x3'] = Formula['+-'](context['hc'], context['dx2'], context['0']);
            context['x4'] = Formula['+-'](context['hc'], context['dx1'], context['0']);
            context['dy3'] = Formula['*/'](context['ss'], context['a3'], context['100000']);
            context['y3'] = Formula['+-'](context['b'], context['0'], context['dy3']);
            context['y2'] = Formula['*/'](context['h'], context['a4'], context['100000']);
            context['y1'] = Formula['*/'](context['y2'], context['1'], context['2']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['y2'])} ${lineTo(
                            context,
                            context['x3'],
                            context['y2']
                        )} ${lineTo(context, context['x3'], context['y3'])} ${lineTo(
                            context,
                            context['x4'],
                            context['y3']
                        )} ${lineTo(context, context['hc'], context['b'])} ${lineTo(
                            context,
                            context['x1'],
                            context['y3']
                        )} ${lineTo(context, context['x2'], context['y3'])} ${lineTo(
                            context,
                            context['x2'],
                            context['y2']
                        )} ${lineTo(context, context['l'], context['y2'])} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.ELLIPSE]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            context['idx'] = Formula['cos'](context['wd2'], context['2700000']);
            context['idy'] = Formula['sin'](context['hd2'], context['2700000']);
            context['il'] = Formula['+-'](context['hc'], context['0'], context['idx']);
            context['ir'] = Formula['+-'](context['hc'], context['idx'], context['0']);
            context['it'] = Formula['+-'](context['vc'], context['0'], context['idy']);
            context['ib'] = Formula['+-'](context['vc'], context['idy'], context['0']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['vc'])} ${arcTo(
                            context,
                            context['wd2'],
                            context['hd2'],
                            context['cd2'],
                            context['cd4']
                        )} ${arcTo(
                            context,
                            context['wd2'],
                            context['hd2'],
                            context['3cd4'],
                            context['cd4']
                        )} ${arcTo(
                            context,
                            context['wd2'],
                            context['hd2'],
                            context['0'],
                            context['cd4']
                        )} ${arcTo(
                            context,
                            context['wd2'],
                            context['hd2'],
                            context['cd4'],
                            context['cd4']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.ELLIPSE_RIBBON]: {
        editable: true,
        defaultValue: [25000, 50000, 12500],
        defaultKey: ['adj1', 'adj2', 'adj3'],
        formula: (width: number, height: number, [adj1, adj2, adj3]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;
            context['adj3'] = adj3;

            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['100000']);
            context['a2'] = Formula['pin'](context['25000'], context['adj2'], context['75000']);
            context['q10'] = Formula['+-'](context['100000'], context['0'], context['a1']);
            context['q11'] = Formula['*/'](context['q10'], context['1'], context['2']);
            context['q12'] = Formula['+-'](context['a1'], context['0'], context['q11']);
            context['minAdj3'] = Formula['max'](context['0'], context['q12']);
            context['a3'] = Formula['pin'](context['minAdj3'], context['adj3'], context['a1']);
            context['dx2'] = Formula['*/'](context['w'], context['a2'], context['200000']);
            context['x2'] = Formula['+-'](context['hc'], context['0'], context['dx2']);
            context['x3'] = Formula['+-'](context['x2'], context['wd8'], context['0']);
            context['x4'] = Formula['+-'](context['r'], context['0'], context['x3']);
            context['x5'] = Formula['+-'](context['r'], context['0'], context['x2']);
            context['x6'] = Formula['+-'](context['r'], context['0'], context['wd8']);
            context['dy1'] = Formula['*/'](context['h'], context['a3'], context['100000']);
            context['f1'] = Formula['*/'](context['4'], context['dy1'], context['w']);
            context['q1'] = Formula['*/'](context['x3'], context['x3'], context['w']);
            context['q2'] = Formula['+-'](context['x3'], context['0'], context['q1']);
            context['y1'] = Formula['*/'](context['f1'], context['q2'], context['1']);
            context['cx1'] = Formula['*/'](context['x3'], context['1'], context['2']);
            context['cy1'] = Formula['*/'](context['f1'], context['cx1'], context['1']);
            context['cx2'] = Formula['+-'](context['r'], context['0'], context['cx1']);
            context['q1'] = Formula['*/'](context['h'], context['a1'], context['100000']);
            context['dy3'] = Formula['+-'](context['q1'], context['0'], context['dy1']);
            context['q3'] = Formula['*/'](context['x2'], context['x2'], context['w']);
            context['q4'] = Formula['+-'](context['x2'], context['0'], context['q3']);
            context['q5'] = Formula['*/'](context['f1'], context['q4'], context['1']);
            context['y3'] = Formula['+-'](context['q5'], context['dy3'], context['0']);
            context['q6'] = Formula['+-'](context['dy1'], context['dy3'], context['y3']);
            context['q7'] = Formula['+-'](context['q6'], context['dy1'], context['0']);
            context['cy3'] = Formula['+-'](context['q7'], context['dy3'], context['0']);
            context['rh'] = Formula['+-'](context['b'], context['0'], context['q1']);
            context['q8'] = Formula['*/'](context['dy1'], context['14'], context['16']);
            context['y2'] = Formula['+/'](context['q8'], context['rh'], context['2']);
            context['y5'] = Formula['+-'](context['q5'], context['rh'], context['0']);
            context['y6'] = Formula['+-'](context['y3'], context['rh'], context['0']);
            context['cx4'] = Formula['*/'](context['x2'], context['1'], context['2']);
            context['q9'] = Formula['*/'](context['f1'], context['cx4'], context['1']);
            context['cy4'] = Formula['+-'](context['q9'], context['rh'], context['0']);
            context['cx5'] = Formula['+-'](context['r'], context['0'], context['cx4']);
            context['cy6'] = Formula['+-'](context['cy3'], context['rh'], context['0']);
            context['y7'] = Formula['+-'](context['y1'], context['dy3'], context['0']);
            context['cy7'] = Formula['+-'](context['q1'], context['q1'], context['y7']);
            context['y8'] = Formula['+-'](context['b'], context['0'], context['dy1']);

            return [
                {
                    d: path(context, { stroke: 'false', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${quadBezTo(
                            context,
                            context['cx1'],
                            context['cy1'],
                            context['x3'],
                            context['y1']
                        )} ${lineTo(context, context['x2'], context['y3'])} ${quadBezTo(
                            context,
                            context['hc'],
                            context['cy3'],
                            context['x5'],
                            context['y3']
                        )} ${lineTo(context, context['x4'], context['y1'])} ${quadBezTo(
                            context,
                            context['cx2'],
                            context['cy1'],
                            context['r'],
                            context['t']
                        )} ${lineTo(context, context['x6'], context['y2'])} ${lineTo(
                            context,
                            context['r'],
                            context['rh']
                        )} ${quadBezTo(
                            context,
                            context['cx5'],
                            context['cy4'],
                            context['x5'],
                            context['y5']
                        )} ${lineTo(context, context['x5'], context['y6'])} ${quadBezTo(
                            context,
                            context['hc'],
                            context['cy6'],
                            context['x2'],
                            context['y6']
                        )} ${lineTo(context, context['x2'], context['y5'])} ${quadBezTo(
                            context,
                            context['cx4'],
                            context['cy4'],
                            context['l'],
                            context['rh']
                        )} ${lineTo(context, context['wd8'], context['y2'])} ${close(context)}`;
                    }),
                    attrs: { stroke: 'false', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(
                        context,
                        { fill: 'darkenLess', stroke: 'false', extrusionOk: 'false' },
                        () => {
                            return `${moveTo(context, context['x3'], context['y7'])} ${lineTo(
                                context,
                                context['x3'],
                                context['y1']
                            )} ${lineTo(context, context['x2'], context['y3'])} ${quadBezTo(
                                context,
                                context['hc'],
                                context['cy3'],
                                context['x5'],
                                context['y3']
                            )} ${lineTo(context, context['x4'], context['y1'])} ${lineTo(
                                context,
                                context['x4'],
                                context['y7']
                            )} ${quadBezTo(
                                context,
                                context['hc'],
                                context['cy7'],
                                context['x3'],
                                context['y7']
                            )} ${close(context)}`;
                        }
                    ),
                    attrs: { fill: 'darkenLess', stroke: 'false', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${quadBezTo(
                            context,
                            context['cx1'],
                            context['cy1'],
                            context['x3'],
                            context['y1']
                        )} ${lineTo(context, context['x2'], context['y3'])} ${quadBezTo(
                            context,
                            context['hc'],
                            context['cy3'],
                            context['x5'],
                            context['y3']
                        )} ${lineTo(context, context['x4'], context['y1'])} ${quadBezTo(
                            context,
                            context['cx2'],
                            context['cy1'],
                            context['r'],
                            context['t']
                        )} ${lineTo(context, context['x6'], context['y2'])} ${lineTo(
                            context,
                            context['r'],
                            context['rh']
                        )} ${quadBezTo(
                            context,
                            context['cx5'],
                            context['cy4'],
                            context['x5'],
                            context['y5']
                        )} ${lineTo(context, context['x5'], context['y6'])} ${quadBezTo(
                            context,
                            context['hc'],
                            context['cy6'],
                            context['x2'],
                            context['y6']
                        )} ${lineTo(context, context['x2'], context['y5'])} ${quadBezTo(
                            context,
                            context['cx4'],
                            context['cy4'],
                            context['l'],
                            context['rh']
                        )} ${lineTo(context, context['wd8'], context['y2'])} ${close(
                            context
                        )} ${moveTo(context, context['x2'], context['y5'])} ${lineTo(
                            context,
                            context['x2'],
                            context['y3']
                        )} ${moveTo(context, context['x5'], context['y3'])} ${lineTo(
                            context,
                            context['x5'],
                            context['y5']
                        )} ${moveTo(context, context['x3'], context['y1'])} ${lineTo(
                            context,
                            context['x3'],
                            context['y7']
                        )} ${moveTo(context, context['x4'], context['y7'])} ${lineTo(
                            context,
                            context['x4'],
                            context['y1']
                        )}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.ELLIPSE_RIBBON2]: {
        editable: true,
        defaultValue: [25000, 50000, 12500],
        defaultKey: ['adj1', 'adj2', 'adj3'],
        formula: (width: number, height: number, [adj1, adj2, adj3]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;
            context['adj3'] = adj3;

            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['100000']);
            context['a2'] = Formula['pin'](context['25000'], context['adj2'], context['75000']);
            context['q10'] = Formula['+-'](context['100000'], context['0'], context['a1']);
            context['q11'] = Formula['*/'](context['q10'], context['1'], context['2']);
            context['q12'] = Formula['+-'](context['a1'], context['0'], context['q11']);
            context['minAdj3'] = Formula['max'](context['0'], context['q12']);
            context['a3'] = Formula['pin'](context['minAdj3'], context['adj3'], context['a1']);
            context['dx2'] = Formula['*/'](context['w'], context['a2'], context['200000']);
            context['x2'] = Formula['+-'](context['hc'], context['0'], context['dx2']);
            context['x3'] = Formula['+-'](context['x2'], context['wd8'], context['0']);
            context['x4'] = Formula['+-'](context['r'], context['0'], context['x3']);
            context['x5'] = Formula['+-'](context['r'], context['0'], context['x2']);
            context['x6'] = Formula['+-'](context['r'], context['0'], context['wd8']);
            context['dy1'] = Formula['*/'](context['h'], context['a3'], context['100000']);
            context['f1'] = Formula['*/'](context['4'], context['dy1'], context['w']);
            context['q1'] = Formula['*/'](context['x3'], context['x3'], context['w']);
            context['q2'] = Formula['+-'](context['x3'], context['0'], context['q1']);
            context['u1'] = Formula['*/'](context['f1'], context['q2'], context['1']);
            context['y1'] = Formula['+-'](context['b'], context['0'], context['u1']);
            context['cx1'] = Formula['*/'](context['x3'], context['1'], context['2']);
            context['cu1'] = Formula['*/'](context['f1'], context['cx1'], context['1']);
            context['cy1'] = Formula['+-'](context['b'], context['0'], context['cu1']);
            context['cx2'] = Formula['+-'](context['r'], context['0'], context['cx1']);
            context['q1'] = Formula['*/'](context['h'], context['a1'], context['100000']);
            context['dy3'] = Formula['+-'](context['q1'], context['0'], context['dy1']);
            context['q3'] = Formula['*/'](context['x2'], context['x2'], context['w']);
            context['q4'] = Formula['+-'](context['x2'], context['0'], context['q3']);
            context['q5'] = Formula['*/'](context['f1'], context['q4'], context['1']);
            context['u3'] = Formula['+-'](context['q5'], context['dy3'], context['0']);
            context['y3'] = Formula['+-'](context['b'], context['0'], context['u3']);
            context['q6'] = Formula['+-'](context['dy1'], context['dy3'], context['u3']);
            context['q7'] = Formula['+-'](context['q6'], context['dy1'], context['0']);
            context['cu3'] = Formula['+-'](context['q7'], context['dy3'], context['0']);
            context['cy3'] = Formula['+-'](context['b'], context['0'], context['cu3']);
            context['rh'] = Formula['+-'](context['b'], context['0'], context['q1']);
            context['q8'] = Formula['*/'](context['dy1'], context['14'], context['16']);
            context['u2'] = Formula['+/'](context['q8'], context['rh'], context['2']);
            context['y2'] = Formula['+-'](context['b'], context['0'], context['u2']);
            context['u5'] = Formula['+-'](context['q5'], context['rh'], context['0']);
            context['y5'] = Formula['+-'](context['b'], context['0'], context['u5']);
            context['u6'] = Formula['+-'](context['u3'], context['rh'], context['0']);
            context['y6'] = Formula['+-'](context['b'], context['0'], context['u6']);
            context['cx4'] = Formula['*/'](context['x2'], context['1'], context['2']);
            context['q9'] = Formula['*/'](context['f1'], context['cx4'], context['1']);
            context['cu4'] = Formula['+-'](context['q9'], context['rh'], context['0']);
            context['cy4'] = Formula['+-'](context['b'], context['0'], context['cu4']);
            context['cx5'] = Formula['+-'](context['r'], context['0'], context['cx4']);
            context['cu6'] = Formula['+-'](context['cu3'], context['rh'], context['0']);
            context['cy6'] = Formula['+-'](context['b'], context['0'], context['cu6']);
            context['u7'] = Formula['+-'](context['u1'], context['dy3'], context['0']);
            context['y7'] = Formula['+-'](context['b'], context['0'], context['u7']);
            context['cu7'] = Formula['+-'](context['q1'], context['q1'], context['u7']);
            context['cy7'] = Formula['+-'](context['b'], context['0'], context['cu7']);

            return [
                {
                    d: path(context, { stroke: 'false', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['l'], context['b'])} ${quadBezTo(
                            context,
                            context['cx1'],
                            context['cy1'],
                            context['x3'],
                            context['y1']
                        )} ${lineTo(context, context['x2'], context['y3'])} ${quadBezTo(
                            context,
                            context['hc'],
                            context['cy3'],
                            context['x5'],
                            context['y3']
                        )} ${lineTo(context, context['x4'], context['y1'])} ${quadBezTo(
                            context,
                            context['cx2'],
                            context['cy1'],
                            context['r'],
                            context['b']
                        )} ${lineTo(context, context['x6'], context['y2'])} ${lineTo(
                            context,
                            context['r'],
                            context['q1']
                        )} ${quadBezTo(
                            context,
                            context['cx5'],
                            context['cy4'],
                            context['x5'],
                            context['y5']
                        )} ${lineTo(context, context['x5'], context['y6'])} ${quadBezTo(
                            context,
                            context['hc'],
                            context['cy6'],
                            context['x2'],
                            context['y6']
                        )} ${lineTo(context, context['x2'], context['y5'])} ${quadBezTo(
                            context,
                            context['cx4'],
                            context['cy4'],
                            context['l'],
                            context['q1']
                        )} ${lineTo(context, context['wd8'], context['y2'])} ${close(context)}`;
                    }),
                    attrs: { stroke: 'false', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(
                        context,
                        { fill: 'darkenLess', stroke: 'false', extrusionOk: 'false' },
                        () => {
                            return `${moveTo(context, context['x3'], context['y7'])} ${lineTo(
                                context,
                                context['x3'],
                                context['y1']
                            )} ${lineTo(context, context['x2'], context['y3'])} ${quadBezTo(
                                context,
                                context['hc'],
                                context['cy3'],
                                context['x5'],
                                context['y3']
                            )} ${lineTo(context, context['x4'], context['y1'])} ${lineTo(
                                context,
                                context['x4'],
                                context['y7']
                            )} ${quadBezTo(
                                context,
                                context['hc'],
                                context['cy7'],
                                context['x3'],
                                context['y7']
                            )} ${close(context)}`;
                        }
                    ),
                    attrs: { fill: 'darkenLess', stroke: 'false', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['l'], context['b'])} ${lineTo(
                            context,
                            context['wd8'],
                            context['y2']
                        )} ${lineTo(context, context['l'], context['q1'])} ${quadBezTo(
                            context,
                            context['cx4'],
                            context['cy4'],
                            context['x2'],
                            context['y5']
                        )} ${lineTo(context, context['x2'], context['y6'])} ${quadBezTo(
                            context,
                            context['hc'],
                            context['cy6'],
                            context['x5'],
                            context['y6']
                        )} ${lineTo(context, context['x5'], context['y5'])} ${quadBezTo(
                            context,
                            context['cx5'],
                            context['cy4'],
                            context['r'],
                            context['q1']
                        )} ${lineTo(context, context['x6'], context['y2'])} ${lineTo(
                            context,
                            context['r'],
                            context['b']
                        )} ${quadBezTo(
                            context,
                            context['cx2'],
                            context['cy1'],
                            context['x4'],
                            context['y1']
                        )} ${lineTo(context, context['x5'], context['y3'])} ${quadBezTo(
                            context,
                            context['hc'],
                            context['cy3'],
                            context['x2'],
                            context['y3']
                        )} ${lineTo(context, context['x3'], context['y1'])} ${quadBezTo(
                            context,
                            context['cx1'],
                            context['cy1'],
                            context['l'],
                            context['b']
                        )} ${close(context)} ${moveTo(
                            context,
                            context['x2'],
                            context['y3']
                        )} ${lineTo(context, context['x2'], context['y5'])} ${moveTo(
                            context,
                            context['x5'],
                            context['y5']
                        )} ${lineTo(context, context['x5'], context['y3'])} ${moveTo(
                            context,
                            context['x3'],
                            context['y7']
                        )} ${lineTo(context, context['x3'], context['y1'])} ${moveTo(
                            context,
                            context['x4'],
                            context['y1']
                        )} ${lineTo(context, context['x4'], context['y7'])}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.FLOW_CHART_ALTERNATE_PROCESS]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            context['x2'] = Formula['+-'](context['r'], context['0'], context['ssd6']);
            context['y2'] = Formula['+-'](context['b'], context['0'], context['ssd6']);
            context['il'] = Formula['*/'](context['ssd6'], context['29289'], context['100000']);
            context['ir'] = Formula['+-'](context['r'], context['0'], context['il']);
            context['ib'] = Formula['+-'](context['b'], context['0'], context['il']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['ssd6'])} ${arcTo(
                            context,
                            context['ssd6'],
                            context['ssd6'],
                            context['cd2'],
                            context['cd4']
                        )} ${lineTo(context, context['x2'], context['t'])} ${arcTo(
                            context,
                            context['ssd6'],
                            context['ssd6'],
                            context['3cd4'],
                            context['cd4']
                        )} ${lineTo(context, context['r'], context['y2'])} ${arcTo(
                            context,
                            context['ssd6'],
                            context['ssd6'],
                            context['0'],
                            context['cd4']
                        )} ${lineTo(context, context['ssd6'], context['b'])} ${arcTo(
                            context,
                            context['ssd6'],
                            context['ssd6'],
                            context['cd4'],
                            context['cd4']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.FLOW_CHART_COLLATE]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            context['ir'] = Formula['*/'](context['w'], context['3'], context['4']);
            context['ib'] = Formula['*/'](context['h'], context['3'], context['4']);

            return [
                {
                    d: path(context, { w: 2, h: 2 }, () => {
                        return `${moveTo(context, context['0'], context['0'])} ${lineTo(
                            context,
                            context['2'],
                            context['0']
                        )} ${lineTo(context, context['1'], context['1'])} ${lineTo(
                            context,
                            context['2'],
                            context['2']
                        )} ${lineTo(context, context['0'], context['2'])} ${lineTo(
                            context,
                            context['1'],
                            context['1']
                        )} ${close(context)}`;
                    }),
                    attrs: { w: 2, h: 2 },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.FLOW_CHART_CONNECTOR]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            context['idx'] = Formula['cos'](context['wd2'], context['2700000']);
            context['idy'] = Formula['sin'](context['hd2'], context['2700000']);
            context['il'] = Formula['+-'](context['hc'], context['0'], context['idx']);
            context['ir'] = Formula['+-'](context['hc'], context['idx'], context['0']);
            context['it'] = Formula['+-'](context['vc'], context['0'], context['idy']);
            context['ib'] = Formula['+-'](context['vc'], context['idy'], context['0']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['vc'])} ${arcTo(
                            context,
                            context['wd2'],
                            context['hd2'],
                            context['cd2'],
                            context['cd4']
                        )} ${arcTo(
                            context,
                            context['wd2'],
                            context['hd2'],
                            context['3cd4'],
                            context['cd4']
                        )} ${arcTo(
                            context,
                            context['wd2'],
                            context['hd2'],
                            context['0'],
                            context['cd4']
                        )} ${arcTo(
                            context,
                            context['wd2'],
                            context['hd2'],
                            context['cd4'],
                            context['cd4']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.FLOW_CHART_DECISION]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            context['ir'] = Formula['*/'](context['w'], context['3'], context['4']);
            context['ib'] = Formula['*/'](context['h'], context['3'], context['4']);

            return [
                {
                    d: path(context, { w: 2, h: 2 }, () => {
                        return `${moveTo(context, context['0'], context['1'])} ${lineTo(
                            context,
                            context['1'],
                            context['0']
                        )} ${lineTo(context, context['2'], context['1'])} ${lineTo(
                            context,
                            context['1'],
                            context['2']
                        )} ${close(context)}`;
                    }),
                    attrs: { w: 2, h: 2 },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.FLOW_CHART_DELAY]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            context['idx'] = Formula['cos'](context['wd2'], context['2700000']);
            context['idy'] = Formula['sin'](context['hd2'], context['2700000']);
            context['ir'] = Formula['+-'](context['hc'], context['idx'], context['0']);
            context['it'] = Formula['+-'](context['vc'], context['0'], context['idy']);
            context['ib'] = Formula['+-'](context['vc'], context['idy'], context['0']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['hc'],
                            context['t']
                        )} ${arcTo(
                            context,
                            context['wd2'],
                            context['hd2'],
                            context['3cd4'],
                            context['cd2']
                        )} ${lineTo(context, context['l'], context['b'])} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.FLOW_CHART_DISPLAY]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            context['x2'] = Formula['*/'](context['w'], context['5'], context['6']);

            return [
                {
                    d: path(context, { w: 6, h: 6 }, () => {
                        return `${moveTo(context, context['0'], context['3'])} ${lineTo(
                            context,
                            context['1'],
                            context['0']
                        )} ${lineTo(context, context['5'], context['0'])} ${arcTo(
                            context,
                            context['1'],
                            context['3'],
                            context['3cd4'],
                            context['cd2']
                        )} ${lineTo(context, context['1'], context['6'])} ${close(context)}`;
                    }),
                    attrs: { w: 6, h: 6 },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.FLOW_CHART_DOCUMENT]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            context['y1'] = Formula['*/'](context['h'], context['17322'], context['21600']);
            context['y2'] = Formula['*/'](context['h'], context['20172'], context['21600']);

            return [
                {
                    d: path(context, { w: 21600, h: 21600 }, () => {
                        return `${moveTo(context, context['0'], context['0'])} ${lineTo(
                            context,
                            context['21600'],
                            context['0']
                        )} ${lineTo(context, context['21600'], context['17322'])} ${cubicBezTo(
                            context,
                            context['10800'],
                            context['17322'],
                            context['10800'],
                            context['23922'],
                            context['0'],
                            context['20172']
                        )} ${close(context)}`;
                    }),
                    attrs: { w: 21600, h: 21600 },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.FLOW_CHART_EXTRACT]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            context['x2'] = Formula['*/'](context['w'], context['3'], context['4']);

            return [
                {
                    d: path(context, { w: 2, h: 2 }, () => {
                        return `${moveTo(context, context['0'], context['2'])} ${lineTo(
                            context,
                            context['1'],
                            context['0']
                        )} ${lineTo(context, context['2'], context['2'])} ${close(context)}`;
                    }),
                    attrs: { w: 2, h: 2 },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.FLOW_CHART_INPUT_OUTPUT]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            context['x3'] = Formula['*/'](context['w'], context['2'], context['5']);
            context['x4'] = Formula['*/'](context['w'], context['3'], context['5']);
            context['x5'] = Formula['*/'](context['w'], context['4'], context['5']);
            context['x6'] = Formula['*/'](context['w'], context['9'], context['10']);

            return [
                {
                    d: path(context, { w: 5, h: 5 }, () => {
                        return `${moveTo(context, context['0'], context['5'])} ${lineTo(
                            context,
                            context['1'],
                            context['0']
                        )} ${lineTo(context, context['5'], context['0'])} ${lineTo(
                            context,
                            context['4'],
                            context['5']
                        )} ${close(context)}`;
                    }),
                    attrs: { w: 5, h: 5 },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.FLOW_CHART_INTERNAL_STORAGE]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            return [
                {
                    d: path(context, { stroke: 'false', extrusionOk: 'false', w: 1, h: 1 }, () => {
                        return `${moveTo(context, context['0'], context['0'])} ${lineTo(
                            context,
                            context['1'],
                            context['0']
                        )} ${lineTo(context, context['1'], context['1'])} ${lineTo(
                            context,
                            context['0'],
                            context['1']
                        )} ${close(context)}`;
                    }),
                    attrs: { stroke: 'false', extrusionOk: 'false', w: 1, h: 1 },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false', w: 8, h: 8 }, () => {
                        return `${moveTo(context, context['1'], context['0'])} ${lineTo(
                            context,
                            context['1'],
                            context['8']
                        )} ${moveTo(context, context['0'], context['1'])} ${lineTo(
                            context,
                            context['8'],
                            context['1']
                        )}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false', w: 8, h: 8 },
                    context,
                },
                {
                    d: path(context, { fill: 'none', w: 1, h: 1 }, () => {
                        return `${moveTo(context, context['0'], context['0'])} ${lineTo(
                            context,
                            context['1'],
                            context['0']
                        )} ${lineTo(context, context['1'], context['1'])} ${lineTo(
                            context,
                            context['0'],
                            context['1']
                        )} ${close(context)}`;
                    }),
                    attrs: { fill: 'none', w: 1, h: 1 },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.FLOW_CHART_MAGNETIC_DISK]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            context['y3'] = Formula['*/'](context['h'], context['5'], context['6']);

            return [
                {
                    d: path(context, { stroke: 'false', extrusionOk: 'false', w: 6, h: 6 }, () => {
                        return `${moveTo(context, context['0'], context['1'])} ${arcTo(
                            context,
                            context['3'],
                            context['1'],
                            context['cd2'],
                            context['cd2']
                        )} ${lineTo(context, context['6'], context['5'])} ${arcTo(
                            context,
                            context['3'],
                            context['1'],
                            context['0'],
                            context['cd2']
                        )} ${close(context)}`;
                    }),
                    attrs: { stroke: 'false', extrusionOk: 'false', w: 6, h: 6 },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false', w: 6, h: 6 }, () => {
                        return `${moveTo(context, context['6'], context['1'])} ${arcTo(
                            context,
                            context['3'],
                            context['1'],
                            context['0'],
                            context['cd2']
                        )}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false', w: 6, h: 6 },
                    context,
                },
                {
                    d: path(context, { fill: 'none', w: 6, h: 6 }, () => {
                        return `${moveTo(context, context['0'], context['1'])} ${arcTo(
                            context,
                            context['3'],
                            context['1'],
                            context['cd2'],
                            context['cd2']
                        )} ${lineTo(context, context['6'], context['5'])} ${arcTo(
                            context,
                            context['3'],
                            context['1'],
                            context['0'],
                            context['cd2']
                        )} ${close(context)}`;
                    }),
                    attrs: { fill: 'none', w: 6, h: 6 },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.FLOW_CHART_MAGNETIC_DRUM]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            context['x2'] = Formula['*/'](context['w'], context['2'], context['3']);

            return [
                {
                    d: path(context, { stroke: 'false', extrusionOk: 'false', w: 6, h: 6 }, () => {
                        return `${moveTo(context, context['1'], context['0'])} ${lineTo(
                            context,
                            context['5'],
                            context['0']
                        )} ${arcTo(
                            context,
                            context['1'],
                            context['3'],
                            context['3cd4'],
                            context['cd2']
                        )} ${lineTo(context, context['1'], context['6'])} ${arcTo(
                            context,
                            context['1'],
                            context['3'],
                            context['cd4'],
                            context['cd2']
                        )} ${close(context)}`;
                    }),
                    attrs: { stroke: 'false', extrusionOk: 'false', w: 6, h: 6 },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false', w: 6, h: 6 }, () => {
                        return `${moveTo(context, context['5'], context['6'])} ${arcTo(
                            context,
                            context['1'],
                            context['3'],
                            context['cd4'],
                            context['cd2']
                        )}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false', w: 6, h: 6 },
                    context,
                },
                {
                    d: path(context, { fill: 'none', w: 6, h: 6 }, () => {
                        return `${moveTo(context, context['1'], context['0'])} ${lineTo(
                            context,
                            context['5'],
                            context['0']
                        )} ${arcTo(
                            context,
                            context['1'],
                            context['3'],
                            context['3cd4'],
                            context['cd2']
                        )} ${lineTo(context, context['1'], context['6'])} ${arcTo(
                            context,
                            context['1'],
                            context['3'],
                            context['cd4'],
                            context['cd2']
                        )} ${close(context)}`;
                    }),
                    attrs: { fill: 'none', w: 6, h: 6 },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.FLOW_CHART_MAGNETIC_TAPE]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            context['idx'] = Formula['cos'](context['wd2'], context['2700000']);
            context['idy'] = Formula['sin'](context['hd2'], context['2700000']);
            context['il'] = Formula['+-'](context['hc'], context['0'], context['idx']);
            context['ir'] = Formula['+-'](context['hc'], context['idx'], context['0']);
            context['it'] = Formula['+-'](context['vc'], context['0'], context['idy']);
            context['ib'] = Formula['+-'](context['vc'], context['idy'], context['0']);
            context['ang1'] = Formula['at2'](context['w'], context['h']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['hc'], context['b'])} ${arcTo(
                            context,
                            context['wd2'],
                            context['hd2'],
                            context['cd4'],
                            context['cd4']
                        )} ${arcTo(
                            context,
                            context['wd2'],
                            context['hd2'],
                            context['cd2'],
                            context['cd4']
                        )} ${arcTo(
                            context,
                            context['wd2'],
                            context['hd2'],
                            context['3cd4'],
                            context['cd4']
                        )} ${arcTo(
                            context,
                            context['wd2'],
                            context['hd2'],
                            context['0'],
                            context['ang1']
                        )} ${lineTo(context, context['r'], context['ib'])} ${lineTo(
                            context,
                            context['r'],
                            context['b']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.FLOW_CHART_MANUAL_INPUT]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            return [
                {
                    d: path(context, { w: 5, h: 5 }, () => {
                        return `${moveTo(context, context['0'], context['1'])} ${lineTo(
                            context,
                            context['5'],
                            context['0']
                        )} ${lineTo(context, context['5'], context['5'])} ${lineTo(
                            context,
                            context['0'],
                            context['5']
                        )} ${close(context)}`;
                    }),
                    attrs: { w: 5, h: 5 },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.FLOW_CHART_MANUAL_OPERATION]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            context['x3'] = Formula['*/'](context['w'], context['4'], context['5']);
            context['x4'] = Formula['*/'](context['w'], context['9'], context['10']);

            return [
                {
                    d: path(context, { w: 5, h: 5 }, () => {
                        return `${moveTo(context, context['0'], context['0'])} ${lineTo(
                            context,
                            context['5'],
                            context['0']
                        )} ${lineTo(context, context['4'], context['5'])} ${lineTo(
                            context,
                            context['1'],
                            context['5']
                        )} ${close(context)}`;
                    }),
                    attrs: { w: 5, h: 5 },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.FLOW_CHART_MERGE]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            context['x2'] = Formula['*/'](context['w'], context['3'], context['4']);

            return [
                {
                    d: path(context, { w: 2, h: 2 }, () => {
                        return `${moveTo(context, context['0'], context['0'])} ${lineTo(
                            context,
                            context['2'],
                            context['0']
                        )} ${lineTo(context, context['1'], context['2'])} ${close(context)}`;
                    }),
                    attrs: { w: 2, h: 2 },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.FLOW_CHART_MULTIDOCUMENT]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            context['y2'] = Formula['*/'](context['h'], context['3675'], context['21600']);
            context['y8'] = Formula['*/'](context['h'], context['20782'], context['21600']);
            context['x3'] = Formula['*/'](context['w'], context['9298'], context['21600']);
            context['x4'] = Formula['*/'](context['w'], context['12286'], context['21600']);
            context['x5'] = Formula['*/'](context['w'], context['18595'], context['21600']);

            return [
                {
                    d: path(
                        context,
                        { stroke: 'false', extrusionOk: 'false', w: 21600, h: 21600 },
                        () => {
                            return `${moveTo(context, context['0'], context['20782'])} ${cubicBezTo(
                                context,
                                context['9298'],
                                context['23542'],
                                context['9298'],
                                context['18022'],
                                context['18595'],
                                context['18022']
                            )} ${lineTo(context, context['18595'], context['3675'])} ${lineTo(
                                context,
                                context['0'],
                                context['3675']
                            )} ${close(context)} ${moveTo(
                                context,
                                context['1532'],
                                context['3675']
                            )} ${lineTo(context, context['1532'], context['1815'])} ${lineTo(
                                context,
                                context['20000'],
                                context['1815']
                            )} ${lineTo(context, context['20000'], context['16252'])} ${cubicBezTo(
                                context,
                                context['19298'],
                                context['16252'],
                                context['18595'],
                                context['16352'],
                                context['18595'],
                                context['16352']
                            )} ${lineTo(context, context['18595'], context['3675'])} ${close(
                                context
                            )} ${moveTo(context, context['2972'], context['1815'])} ${lineTo(
                                context,
                                context['2972'],
                                context['0']
                            )} ${lineTo(context, context['21600'], context['0'])} ${lineTo(
                                context,
                                context['21600'],
                                context['14392']
                            )} ${cubicBezTo(
                                context,
                                context['20800'],
                                context['14392'],
                                context['20000'],
                                context['14467'],
                                context['20000'],
                                context['14467']
                            )} ${lineTo(context, context['20000'], context['1815'])} ${close(
                                context
                            )}`;
                        }
                    ),
                    attrs: { stroke: 'false', extrusionOk: 'false', w: 21600, h: 21600 },
                    context,
                },
                {
                    d: path(
                        context,
                        { fill: 'none', extrusionOk: 'false', w: 21600, h: 21600 },
                        () => {
                            return `${moveTo(context, context['0'], context['3675'])} ${lineTo(
                                context,
                                context['18595'],
                                context['3675']
                            )} ${lineTo(context, context['18595'], context['18022'])} ${cubicBezTo(
                                context,
                                context['9298'],
                                context['18022'],
                                context['9298'],
                                context['23542'],
                                context['0'],
                                context['20782']
                            )} ${close(context)} ${moveTo(
                                context,
                                context['1532'],
                                context['3675']
                            )} ${lineTo(context, context['1532'], context['1815'])} ${lineTo(
                                context,
                                context['20000'],
                                context['1815']
                            )} ${lineTo(context, context['20000'], context['16252'])} ${cubicBezTo(
                                context,
                                context['19298'],
                                context['16252'],
                                context['18595'],
                                context['16352'],
                                context['18595'],
                                context['16352']
                            )} ${moveTo(context, context['2972'], context['1815'])} ${lineTo(
                                context,
                                context['2972'],
                                context['0']
                            )} ${lineTo(context, context['21600'], context['0'])} ${lineTo(
                                context,
                                context['21600'],
                                context['14392']
                            )} ${cubicBezTo(
                                context,
                                context['20800'],
                                context['14392'],
                                context['20000'],
                                context['14467'],
                                context['20000'],
                                context['14467']
                            )}`;
                        }
                    ),
                    attrs: { fill: 'none', extrusionOk: 'false', w: 21600, h: 21600 },
                    context,
                },
                {
                    d: path(context, { stroke: 'false', fill: 'none', w: 21600, h: 21600 }, () => {
                        return `${moveTo(context, context['0'], context['20782'])} ${cubicBezTo(
                            context,
                            context['9298'],
                            context['23542'],
                            context['9298'],
                            context['18022'],
                            context['18595'],
                            context['18022']
                        )} ${lineTo(context, context['18595'], context['16352'])} ${cubicBezTo(
                            context,
                            context['18595'],
                            context['16352'],
                            context['19298'],
                            context['16252'],
                            context['20000'],
                            context['16252']
                        )} ${lineTo(context, context['20000'], context['14467'])} ${cubicBezTo(
                            context,
                            context['20000'],
                            context['14467'],
                            context['20800'],
                            context['14392'],
                            context['21600'],
                            context['14392']
                        )} ${lineTo(context, context['21600'], context['0'])} ${lineTo(
                            context,
                            context['2972'],
                            context['0']
                        )} ${lineTo(context, context['2972'], context['1815'])} ${lineTo(
                            context,
                            context['1532'],
                            context['1815']
                        )} ${lineTo(context, context['1532'], context['3675'])} ${lineTo(
                            context,
                            context['0'],
                            context['3675']
                        )} ${close(context)}`;
                    }),
                    attrs: { stroke: 'false', fill: 'none', w: 21600, h: 21600 },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.FLOW_CHART_OFFLINE_STORAGE]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            context['x4'] = Formula['*/'](context['w'], context['3'], context['4']);

            return [
                {
                    d: path(context, { stroke: 'false', extrusionOk: 'false', w: 2, h: 2 }, () => {
                        return `${moveTo(context, context['0'], context['0'])} ${lineTo(
                            context,
                            context['2'],
                            context['0']
                        )} ${lineTo(context, context['1'], context['2'])} ${close(context)}`;
                    }),
                    attrs: { stroke: 'false', extrusionOk: 'false', w: 2, h: 2 },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false', w: 5, h: 5 }, () => {
                        return `${moveTo(context, context['2'], context['4'])} ${lineTo(
                            context,
                            context['3'],
                            context['4']
                        )}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false', w: 5, h: 5 },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'true', w: 2, h: 2 }, () => {
                        return `${moveTo(context, context['0'], context['0'])} ${lineTo(
                            context,
                            context['2'],
                            context['0']
                        )} ${lineTo(context, context['1'], context['2'])} ${close(context)}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'true', w: 2, h: 2 },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.FLOW_CHART_OFFPAGE_CONNECTOR]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            context['y1'] = Formula['*/'](context['h'], context['4'], context['5']);

            return [
                {
                    d: path(context, { w: 10, h: 10 }, () => {
                        return `${moveTo(context, context['0'], context['0'])} ${lineTo(
                            context,
                            context['10'],
                            context['0']
                        )} ${lineTo(context, context['10'], context['8'])} ${lineTo(
                            context,
                            context['5'],
                            context['10']
                        )} ${lineTo(context, context['0'], context['8'])} ${close(context)}`;
                    }),
                    attrs: { w: 10, h: 10 },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.FLOW_CHART_ONLINE_STORAGE]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            context['x2'] = Formula['*/'](context['w'], context['5'], context['6']);

            return [
                {
                    d: path(context, { w: 6, h: 6 }, () => {
                        return `${moveTo(context, context['1'], context['0'])} ${lineTo(
                            context,
                            context['6'],
                            context['0']
                        )} ${arcTo(
                            context,
                            context['1'],
                            context['3'],
                            context['3cd4'],
                            context['-10800000']
                        )} ${lineTo(context, context['1'], context['6'])} ${arcTo(
                            context,
                            context['1'],
                            context['3'],
                            context['cd4'],
                            context['cd2']
                        )} ${close(context)}`;
                    }),
                    attrs: { w: 6, h: 6 },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.FLOW_CHART_OR]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            context['idx'] = Formula['cos'](context['wd2'], context['2700000']);
            context['idy'] = Formula['sin'](context['hd2'], context['2700000']);
            context['il'] = Formula['+-'](context['hc'], context['0'], context['idx']);
            context['ir'] = Formula['+-'](context['hc'], context['idx'], context['0']);
            context['it'] = Formula['+-'](context['vc'], context['0'], context['idy']);
            context['ib'] = Formula['+-'](context['vc'], context['idy'], context['0']);

            return [
                {
                    d: path(context, { stroke: 'false', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['l'], context['vc'])} ${arcTo(
                            context,
                            context['wd2'],
                            context['hd2'],
                            context['cd2'],
                            context['cd4']
                        )} ${arcTo(
                            context,
                            context['wd2'],
                            context['hd2'],
                            context['3cd4'],
                            context['cd4']
                        )} ${arcTo(
                            context,
                            context['wd2'],
                            context['hd2'],
                            context['0'],
                            context['cd4']
                        )} ${arcTo(
                            context,
                            context['wd2'],
                            context['hd2'],
                            context['cd4'],
                            context['cd4']
                        )} ${close(context)}`;
                    }),
                    attrs: { stroke: 'false', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['hc'], context['t'])} ${lineTo(
                            context,
                            context['hc'],
                            context['b']
                        )} ${moveTo(context, context['l'], context['vc'])} ${lineTo(
                            context,
                            context['r'],
                            context['vc']
                        )}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none' }, () => {
                        return `${moveTo(context, context['l'], context['vc'])} ${arcTo(
                            context,
                            context['wd2'],
                            context['hd2'],
                            context['cd2'],
                            context['cd4']
                        )} ${arcTo(
                            context,
                            context['wd2'],
                            context['hd2'],
                            context['3cd4'],
                            context['cd4']
                        )} ${arcTo(
                            context,
                            context['wd2'],
                            context['hd2'],
                            context['0'],
                            context['cd4']
                        )} ${arcTo(
                            context,
                            context['wd2'],
                            context['hd2'],
                            context['cd4'],
                            context['cd4']
                        )} ${close(context)}`;
                    }),
                    attrs: { fill: 'none' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.FLOW_CHART_PREDEFINED_PROCESS]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            context['x2'] = Formula['*/'](context['w'], context['7'], context['8']);

            return [
                {
                    d: path(context, { stroke: 'false', extrusionOk: 'false', w: 1, h: 1 }, () => {
                        return `${moveTo(context, context['0'], context['0'])} ${lineTo(
                            context,
                            context['1'],
                            context['0']
                        )} ${lineTo(context, context['1'], context['1'])} ${lineTo(
                            context,
                            context['0'],
                            context['1']
                        )} ${close(context)}`;
                    }),
                    attrs: { stroke: 'false', extrusionOk: 'false', w: 1, h: 1 },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false', w: 8, h: 8 }, () => {
                        return `${moveTo(context, context['1'], context['0'])} ${lineTo(
                            context,
                            context['1'],
                            context['8']
                        )} ${moveTo(context, context['7'], context['0'])} ${lineTo(
                            context,
                            context['7'],
                            context['8']
                        )}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false', w: 8, h: 8 },
                    context,
                },
                {
                    d: path(context, { fill: 'none', w: 1, h: 1 }, () => {
                        return `${moveTo(context, context['0'], context['0'])} ${lineTo(
                            context,
                            context['1'],
                            context['0']
                        )} ${lineTo(context, context['1'], context['1'])} ${lineTo(
                            context,
                            context['0'],
                            context['1']
                        )} ${close(context)}`;
                    }),
                    attrs: { fill: 'none', w: 1, h: 1 },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.FLOW_CHART_PREPARATION]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            context['x2'] = Formula['*/'](context['w'], context['4'], context['5']);

            return [
                {
                    d: path(context, { w: 10, h: 10 }, () => {
                        return `${moveTo(context, context['0'], context['5'])} ${lineTo(
                            context,
                            context['2'],
                            context['0']
                        )} ${lineTo(context, context['8'], context['0'])} ${lineTo(
                            context,
                            context['10'],
                            context['5']
                        )} ${lineTo(context, context['8'], context['10'])} ${lineTo(
                            context,
                            context['2'],
                            context['10']
                        )} ${close(context)}`;
                    }),
                    attrs: { w: 10, h: 10 },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.FLOW_CHART_PROCESS]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            return [
                {
                    d: path(context, { w: 1, h: 1 }, () => {
                        return `${moveTo(context, context['0'], context['0'])} ${lineTo(
                            context,
                            context['1'],
                            context['0']
                        )} ${lineTo(context, context['1'], context['1'])} ${lineTo(
                            context,
                            context['0'],
                            context['1']
                        )} ${close(context)}`;
                    }),
                    attrs: { w: 1, h: 1 },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.FLOW_CHART_PUNCHED_CARD]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            return [
                {
                    d: path(context, { w: 5, h: 5 }, () => {
                        return `${moveTo(context, context['0'], context['1'])} ${lineTo(
                            context,
                            context['1'],
                            context['0']
                        )} ${lineTo(context, context['5'], context['0'])} ${lineTo(
                            context,
                            context['5'],
                            context['5']
                        )} ${lineTo(context, context['0'], context['5'])} ${close(context)}`;
                    }),
                    attrs: { w: 5, h: 5 },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.FLOW_CHART_PUNCHED_TAPE]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            context['y2'] = Formula['*/'](context['h'], context['9'], context['10']);
            context['ib'] = Formula['*/'](context['h'], context['4'], context['5']);

            return [
                {
                    d: path(context, { w: 20, h: 20 }, () => {
                        return `${moveTo(context, context['0'], context['2'])} ${arcTo(
                            context,
                            context['5'],
                            context['2'],
                            context['cd2'],
                            context['-10800000']
                        )} ${arcTo(
                            context,
                            context['5'],
                            context['2'],
                            context['cd2'],
                            context['cd2']
                        )} ${lineTo(context, context['20'], context['18'])} ${arcTo(
                            context,
                            context['5'],
                            context['2'],
                            context['0'],
                            context['-10800000']
                        )} ${arcTo(
                            context,
                            context['5'],
                            context['2'],
                            context['0'],
                            context['cd2']
                        )} ${close(context)}`;
                    }),
                    attrs: { w: 20, h: 20 },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.FLOW_CHART_SORT]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            context['ir'] = Formula['*/'](context['w'], context['3'], context['4']);
            context['ib'] = Formula['*/'](context['h'], context['3'], context['4']);

            return [
                {
                    d: path(context, { stroke: 'false', extrusionOk: 'false', w: 2, h: 2 }, () => {
                        return `${moveTo(context, context['0'], context['1'])} ${lineTo(
                            context,
                            context['1'],
                            context['0']
                        )} ${lineTo(context, context['2'], context['1'])} ${lineTo(
                            context,
                            context['1'],
                            context['2']
                        )} ${close(context)}`;
                    }),
                    attrs: { stroke: 'false', extrusionOk: 'false', w: 2, h: 2 },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false', w: 2, h: 2 }, () => {
                        return `${moveTo(context, context['0'], context['1'])} ${lineTo(
                            context,
                            context['2'],
                            context['1']
                        )}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false', w: 2, h: 2 },
                    context,
                },
                {
                    d: path(context, { fill: 'none', w: 2, h: 2 }, () => {
                        return `${moveTo(context, context['0'], context['1'])} ${lineTo(
                            context,
                            context['1'],
                            context['0']
                        )} ${lineTo(context, context['2'], context['1'])} ${lineTo(
                            context,
                            context['1'],
                            context['2']
                        )} ${close(context)}`;
                    }),
                    attrs: { fill: 'none', w: 2, h: 2 },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.FLOW_CHART_SUMMING_JUNCTION]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            context['idx'] = Formula['cos'](context['wd2'], context['2700000']);
            context['idy'] = Formula['sin'](context['hd2'], context['2700000']);
            context['il'] = Formula['+-'](context['hc'], context['0'], context['idx']);
            context['ir'] = Formula['+-'](context['hc'], context['idx'], context['0']);
            context['it'] = Formula['+-'](context['vc'], context['0'], context['idy']);
            context['ib'] = Formula['+-'](context['vc'], context['idy'], context['0']);

            return [
                {
                    d: path(context, { stroke: 'false', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['l'], context['vc'])} ${arcTo(
                            context,
                            context['wd2'],
                            context['hd2'],
                            context['cd2'],
                            context['cd4']
                        )} ${arcTo(
                            context,
                            context['wd2'],
                            context['hd2'],
                            context['3cd4'],
                            context['cd4']
                        )} ${arcTo(
                            context,
                            context['wd2'],
                            context['hd2'],
                            context['0'],
                            context['cd4']
                        )} ${arcTo(
                            context,
                            context['wd2'],
                            context['hd2'],
                            context['cd4'],
                            context['cd4']
                        )} ${close(context)}`;
                    }),
                    attrs: { stroke: 'false', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['il'], context['it'])} ${lineTo(
                            context,
                            context['ir'],
                            context['ib']
                        )} ${moveTo(context, context['ir'], context['it'])} ${lineTo(
                            context,
                            context['il'],
                            context['ib']
                        )}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none' }, () => {
                        return `${moveTo(context, context['l'], context['vc'])} ${arcTo(
                            context,
                            context['wd2'],
                            context['hd2'],
                            context['cd2'],
                            context['cd4']
                        )} ${arcTo(
                            context,
                            context['wd2'],
                            context['hd2'],
                            context['3cd4'],
                            context['cd4']
                        )} ${arcTo(
                            context,
                            context['wd2'],
                            context['hd2'],
                            context['0'],
                            context['cd4']
                        )} ${arcTo(
                            context,
                            context['wd2'],
                            context['hd2'],
                            context['cd4'],
                            context['cd4']
                        )} ${close(context)}`;
                    }),
                    attrs: { fill: 'none' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.FLOW_CHART_TERMINATOR]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            context['il'] = Formula['*/'](context['w'], context['1018'], context['21600']);
            context['ir'] = Formula['*/'](context['w'], context['20582'], context['21600']);
            context['it'] = Formula['*/'](context['h'], context['3163'], context['21600']);
            context['ib'] = Formula['*/'](context['h'], context['18437'], context['21600']);

            return [
                {
                    d: path(context, { w: 21600, h: 21600 }, () => {
                        return `${moveTo(context, context['3475'], context['0'])} ${lineTo(
                            context,
                            context['18125'],
                            context['0']
                        )} ${arcTo(
                            context,
                            context['3475'],
                            context['10800'],
                            context['3cd4'],
                            context['cd2']
                        )} ${lineTo(context, context['3475'], context['21600'])} ${arcTo(
                            context,
                            context['3475'],
                            context['10800'],
                            context['cd4'],
                            context['cd2']
                        )} ${close(context)}`;
                    }),
                    attrs: { w: 21600, h: 21600 },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.FOLDED_CORNER]: {
        editable: true,
        defaultValue: [16667],
        defaultKey: ['adj'],
        formula: (width: number, height: number, [adj]: number[]) => {
            const context = getContext(width, height);
            context['adj'] = adj;

            context['a'] = Formula['pin'](context['0'], context['adj'], context['50000']);
            context['dy2'] = Formula['*/'](context['ss'], context['a'], context['100000']);
            context['dy1'] = Formula['*/'](context['dy2'], context['1'], context['5']);
            context['x1'] = Formula['+-'](context['r'], context['0'], context['dy2']);
            context['x2'] = Formula['+-'](context['x1'], context['dy1'], context['0']);
            context['y2'] = Formula['+-'](context['b'], context['0'], context['dy2']);
            context['y1'] = Formula['+-'](context['y2'], context['dy1'], context['0']);

            return [
                {
                    d: path(context, { stroke: 'false', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['y2'])} ${lineTo(
                            context,
                            context['x1'],
                            context['b']
                        )} ${lineTo(context, context['l'], context['b'])} ${close(context)}`;
                    }),
                    attrs: { stroke: 'false', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(
                        context,
                        { stroke: 'false', fill: 'darkenLess', extrusionOk: 'false' },
                        () => {
                            return `${moveTo(context, context['x1'], context['b'])} ${lineTo(
                                context,
                                context['x2'],
                                context['y1']
                            )} ${lineTo(context, context['r'], context['y2'])} ${close(context)}`;
                        }
                    ),
                    attrs: { stroke: 'false', fill: 'darkenLess', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['x1'], context['b'])} ${lineTo(
                            context,
                            context['x2'],
                            context['y1']
                        )} ${lineTo(context, context['r'], context['y2'])} ${lineTo(
                            context,
                            context['x1'],
                            context['b']
                        )} ${lineTo(context, context['l'], context['b'])} ${lineTo(
                            context,
                            context['l'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['y2']
                        )}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.FRAME]: {
        editable: true,
        defaultValue: [12500],
        defaultKey: ['adj1'],
        formula: (width: number, height: number, [adj1]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;

            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['50000']);
            context['x1'] = Formula['*/'](context['ss'], context['a1'], context['100000']);
            context['x4'] = Formula['+-'](context['r'], context['0'], context['x1']);
            context['y4'] = Formula['+-'](context['b'], context['0'], context['x1']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['b'])} ${lineTo(
                            context,
                            context['l'],
                            context['b']
                        )} ${close(context)} ${moveTo(
                            context,
                            context['x1'],
                            context['x1']
                        )} ${lineTo(context, context['x1'], context['y4'])} ${lineTo(
                            context,
                            context['x4'],
                            context['y4']
                        )} ${lineTo(context, context['x4'], context['x1'])} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.FUNNEL]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            context['d'] = Formula['*/'](context['ss'], context['1'], context['20']);
            context['rw2'] = Formula['+-'](context['wd2'], context['0'], context['d']);
            context['rh2'] = Formula['+-'](context['hd4'], context['0'], context['d']);
            context['t1'] = Formula['cos'](context['wd2'], context['480000']);
            context['t2'] = Formula['sin'](context['hd4'], context['480000']);
            context['da'] = Formula['at2'](context['t1'], context['t2']);
            context['2da'] = Formula['*/'](context['da'], context['2'], context['1']);
            context['stAng1'] = Formula['+-'](context['cd2'], context['0'], context['da']);
            context['swAng1'] = Formula['+-'](context['cd2'], context['2da'], context['0']);
            context['swAng3'] = Formula['+-'](context['cd2'], context['0'], context['2da']);
            context['rw3'] = Formula['*/'](context['wd2'], context['1'], context['4']);
            context['rh3'] = Formula['*/'](context['hd4'], context['1'], context['4']);
            context['ct1'] = Formula['cos'](context['hd4'], context['stAng1']);
            context['st1'] = Formula['sin'](context['wd2'], context['stAng1']);
            context['m1'] = Formula['mod'](context['ct1'], context['st1'], context['0']);
            context['n1'] = Formula['*/'](context['wd2'], context['hd4'], context['m1']);
            context['dx1'] = Formula['cos'](context['n1'], context['stAng1']);
            context['dy1'] = Formula['sin'](context['n1'], context['stAng1']);
            context['x1'] = Formula['+-'](context['hc'], context['dx1'], context['0']);
            context['y1'] = Formula['+-'](context['hd4'], context['dy1'], context['0']);
            context['ct3'] = Formula['cos'](context['rh3'], context['da']);
            context['st3'] = Formula['sin'](context['rw3'], context['da']);
            context['m3'] = Formula['mod'](context['ct3'], context['st3'], context['0']);
            context['n3'] = Formula['*/'](context['rw3'], context['rh3'], context['m3']);
            context['dx3'] = Formula['cos'](context['n3'], context['da']);
            context['dy3'] = Formula['sin'](context['n3'], context['da']);
            context['x3'] = Formula['+-'](context['hc'], context['dx3'], context['0']);
            context['vc3'] = Formula['+-'](context['b'], context['0'], context['rh3']);
            context['y2'] = Formula['+-'](context['vc3'], context['dy3'], context['0']);
            context['x2'] = Formula['+-'](context['wd2'], context['0'], context['rw2']);
            context['cd'] = Formula['*/'](context['cd2'], context['2'], context['1']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['x1'], context['y1'])} ${arcTo(
                            context,
                            context['wd2'],
                            context['hd4'],
                            context['stAng1'],
                            context['swAng1']
                        )} ${lineTo(context, context['x3'], context['y2'])} ${arcTo(
                            context,
                            context['rw3'],
                            context['rh3'],
                            context['da'],
                            context['swAng3']
                        )} ${close(context)} ${moveTo(
                            context,
                            context['x2'],
                            context['hd4']
                        )} ${arcTo(
                            context,
                            context['rw2'],
                            context['rh2'],
                            context['cd2'],
                            context['-21600000']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.GEAR6]: {
        editable: true,
        defaultValue: [15000, 3526],
        defaultKey: ['adj1', 'adj2'],
        formula: (width: number, height: number, [adj1, adj2]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;

            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['20000']);
            context['a2'] = Formula['pin'](context['0'], context['adj2'], context['5358']);
            context['th'] = Formula['*/'](context['ss'], context['a1'], context['100000']);
            context['lFD'] = Formula['*/'](context['ss'], context['a2'], context['100000']);
            context['th2'] = Formula['*/'](context['th'], context['1'], context['2']);
            context['l2'] = Formula['*/'](context['lFD'], context['1'], context['2']);
            context['l3'] = Formula['+-'](context['th2'], context['l2'], context['0']);
            context['rh'] = Formula['+-'](context['hd2'], context['0'], context['th']);
            context['rw'] = Formula['+-'](context['wd2'], context['0'], context['th']);
            context['dr'] = Formula['+-'](context['rw'], context['0'], context['rh']);
            context['maxr'] = Formula['?:'](context['dr'], context['rh'], context['rw']);
            context['ha'] = Formula['at2'](context['maxr'], context['l3']);
            context['aA1'] = Formula['+-'](context['19800000'], context['0'], context['ha']);
            context['aD1'] = Formula['+-'](context['19800000'], context['ha'], context['0']);
            context['ta11'] = Formula['cos'](context['rw'], context['aA1']);
            context['ta12'] = Formula['sin'](context['rh'], context['aA1']);
            context['bA1'] = Formula['at2'](context['ta11'], context['ta12']);
            context['cta1'] = Formula['cos'](context['rh'], context['bA1']);
            context['sta1'] = Formula['sin'](context['rw'], context['bA1']);
            context['ma1'] = Formula['mod'](context['cta1'], context['sta1'], context['0']);
            context['na1'] = Formula['*/'](context['rw'], context['rh'], context['ma1']);
            context['dxa1'] = Formula['cos'](context['na1'], context['bA1']);
            context['dya1'] = Formula['sin'](context['na1'], context['bA1']);
            context['xA1'] = Formula['+-'](context['hc'], context['dxa1'], context['0']);
            context['yA1'] = Formula['+-'](context['vc'], context['dya1'], context['0']);
            context['td11'] = Formula['cos'](context['rw'], context['aD1']);
            context['td12'] = Formula['sin'](context['rh'], context['aD1']);
            context['bD1'] = Formula['at2'](context['td11'], context['td12']);
            context['ctd1'] = Formula['cos'](context['rh'], context['bD1']);
            context['std1'] = Formula['sin'](context['rw'], context['bD1']);
            context['md1'] = Formula['mod'](context['ctd1'], context['std1'], context['0']);
            context['nd1'] = Formula['*/'](context['rw'], context['rh'], context['md1']);
            context['dxd1'] = Formula['cos'](context['nd1'], context['bD1']);
            context['dyd1'] = Formula['sin'](context['nd1'], context['bD1']);
            context['xD1'] = Formula['+-'](context['hc'], context['dxd1'], context['0']);
            context['yD1'] = Formula['+-'](context['vc'], context['dyd1'], context['0']);
            context['xAD1'] = Formula['+-'](context['xA1'], context['0'], context['xD1']);
            context['yAD1'] = Formula['+-'](context['yA1'], context['0'], context['yD1']);
            context['lAD1'] = Formula['mod'](context['xAD1'], context['yAD1'], context['0']);
            context['a1'] = Formula['at2'](context['yAD1'], context['xAD1']);
            context['dxF1'] = Formula['sin'](context['lFD'], context['a1']);
            context['dyF1'] = Formula['cos'](context['lFD'], context['a1']);
            context['xF1'] = Formula['+-'](context['xD1'], context['dxF1'], context['0']);
            context['yF1'] = Formula['+-'](context['yD1'], context['dyF1'], context['0']);
            context['xE1'] = Formula['+-'](context['xA1'], context['0'], context['dxF1']);
            context['yE1'] = Formula['+-'](context['yA1'], context['0'], context['dyF1']);
            context['yC1t'] = Formula['sin'](context['th'], context['a1']);
            context['xC1t'] = Formula['cos'](context['th'], context['a1']);
            context['yC1'] = Formula['+-'](context['yF1'], context['yC1t'], context['0']);
            context['xC1'] = Formula['+-'](context['xF1'], context['0'], context['xC1t']);
            context['yB1'] = Formula['+-'](context['yE1'], context['yC1t'], context['0']);
            context['xB1'] = Formula['+-'](context['xE1'], context['0'], context['xC1t']);
            context['aD6'] = Formula['+-'](context['3cd4'], context['ha'], context['0']);
            context['td61'] = Formula['cos'](context['rw'], context['aD6']);
            context['td62'] = Formula['sin'](context['rh'], context['aD6']);
            context['bD6'] = Formula['at2'](context['td61'], context['td62']);
            context['ctd6'] = Formula['cos'](context['rh'], context['bD6']);
            context['std6'] = Formula['sin'](context['rw'], context['bD6']);
            context['md6'] = Formula['mod'](context['ctd6'], context['std6'], context['0']);
            context['nd6'] = Formula['*/'](context['rw'], context['rh'], context['md6']);
            context['dxd6'] = Formula['cos'](context['nd6'], context['bD6']);
            context['dyd6'] = Formula['sin'](context['nd6'], context['bD6']);
            context['xD6'] = Formula['+-'](context['hc'], context['dxd6'], context['0']);
            context['yD6'] = Formula['+-'](context['vc'], context['dyd6'], context['0']);
            context['xA6'] = Formula['+-'](context['hc'], context['0'], context['dxd6']);
            context['xF6'] = Formula['+-'](context['xD6'], context['0'], context['lFD']);
            context['xE6'] = Formula['+-'](context['xA6'], context['lFD'], context['0']);
            context['yC6'] = Formula['+-'](context['yD6'], context['0'], context['th']);
            context['swAng1'] = Formula['+-'](context['bA1'], context['0'], context['bD6']);
            context['aA2'] = Formula['+-'](context['1800000'], context['0'], context['ha']);
            context['aD2'] = Formula['+-'](context['1800000'], context['ha'], context['0']);
            context['ta21'] = Formula['cos'](context['rw'], context['aA2']);
            context['ta22'] = Formula['sin'](context['rh'], context['aA2']);
            context['bA2'] = Formula['at2'](context['ta21'], context['ta22']);
            context['yA2'] = Formula['+-'](context['h'], context['0'], context['yD1']);
            context['td21'] = Formula['cos'](context['rw'], context['aD2']);
            context['td22'] = Formula['sin'](context['rh'], context['aD2']);
            context['bD2'] = Formula['at2'](context['td21'], context['td22']);
            context['yD2'] = Formula['+-'](context['h'], context['0'], context['yA1']);
            context['yC2'] = Formula['+-'](context['h'], context['0'], context['yB1']);
            context['yB2'] = Formula['+-'](context['h'], context['0'], context['yC1']);
            context['xB2'] = Formula['val'](context['xC1']);
            context['swAng2'] = Formula['+-'](context['bA2'], context['0'], context['bD1']);
            context['aD3'] = Formula['+-'](context['cd4'], context['ha'], context['0']);
            context['td31'] = Formula['cos'](context['rw'], context['aD3']);
            context['td32'] = Formula['sin'](context['rh'], context['aD3']);
            context['bD3'] = Formula['at2'](context['td31'], context['td32']);
            context['yD3'] = Formula['+-'](context['h'], context['0'], context['yD6']);
            context['yB3'] = Formula['+-'](context['h'], context['0'], context['yC6']);
            context['aD4'] = Formula['+-'](context['9000000'], context['ha'], context['0']);
            context['td41'] = Formula['cos'](context['rw'], context['aD4']);
            context['td42'] = Formula['sin'](context['rh'], context['aD4']);
            context['bD4'] = Formula['at2'](context['td41'], context['td42']);
            context['xD4'] = Formula['+-'](context['w'], context['0'], context['xD1']);
            context['xC4'] = Formula['+-'](context['w'], context['0'], context['xC1']);
            context['xB4'] = Formula['+-'](context['w'], context['0'], context['xB1']);
            context['aD5'] = Formula['+-'](context['12600000'], context['ha'], context['0']);
            context['td51'] = Formula['cos'](context['rw'], context['aD5']);
            context['td52'] = Formula['sin'](context['rh'], context['aD5']);
            context['bD5'] = Formula['at2'](context['td51'], context['td52']);
            context['xD5'] = Formula['+-'](context['w'], context['0'], context['xA1']);
            context['xC5'] = Formula['+-'](context['w'], context['0'], context['xB1']);
            context['xB5'] = Formula['+-'](context['w'], context['0'], context['xC1']);
            context['xCxn1'] = Formula['+/'](context['xB1'], context['xC1'], context['2']);
            context['yCxn1'] = Formula['+/'](context['yB1'], context['yC1'], context['2']);
            context['yCxn2'] = Formula['+-'](context['b'], context['0'], context['yCxn1']);
            context['xCxn4'] = Formula['+/'](context['r'], context['0'], context['xCxn1']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['xA1'], context['yA1'])} ${lineTo(
                            context,
                            context['xB1'],
                            context['yB1']
                        )} ${lineTo(context, context['xC1'], context['yC1'])} ${lineTo(
                            context,
                            context['xD1'],
                            context['yD1']
                        )} ${arcTo(
                            context,
                            context['rw'],
                            context['rh'],
                            context['bD1'],
                            context['swAng2']
                        )} ${lineTo(context, context['xC1'], context['yB2'])} ${lineTo(
                            context,
                            context['xB1'],
                            context['yC2']
                        )} ${lineTo(context, context['xA1'], context['yD2'])} ${arcTo(
                            context,
                            context['rw'],
                            context['rh'],
                            context['bD2'],
                            context['swAng1']
                        )} ${lineTo(context, context['xF6'], context['yB3'])} ${lineTo(
                            context,
                            context['xE6'],
                            context['yB3']
                        )} ${lineTo(context, context['xA6'], context['yD3'])} ${arcTo(
                            context,
                            context['rw'],
                            context['rh'],
                            context['bD3'],
                            context['swAng1']
                        )} ${lineTo(context, context['xB4'], context['yC2'])} ${lineTo(
                            context,
                            context['xC4'],
                            context['yB2']
                        )} ${lineTo(context, context['xD4'], context['yA2'])} ${arcTo(
                            context,
                            context['rw'],
                            context['rh'],
                            context['bD4'],
                            context['swAng2']
                        )} ${lineTo(context, context['xB5'], context['yC1'])} ${lineTo(
                            context,
                            context['xC5'],
                            context['yB1']
                        )} ${lineTo(context, context['xD5'], context['yA1'])} ${arcTo(
                            context,
                            context['rw'],
                            context['rh'],
                            context['bD5'],
                            context['swAng1']
                        )} ${lineTo(context, context['xE6'], context['yC6'])} ${lineTo(
                            context,
                            context['xF6'],
                            context['yC6']
                        )} ${lineTo(context, context['xD6'], context['yD6'])} ${arcTo(
                            context,
                            context['rw'],
                            context['rh'],
                            context['bD6'],
                            context['swAng1']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.GEAR9]: {
        editable: true,
        defaultValue: [10000, 1763],
        defaultKey: ['adj1', 'adj2'],
        formula: (width: number, height: number, [adj1, adj2]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;

            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['20000']);
            context['a2'] = Formula['pin'](context['0'], context['adj2'], context['2679']);
            context['th'] = Formula['*/'](context['ss'], context['a1'], context['100000']);
            context['lFD'] = Formula['*/'](context['ss'], context['a2'], context['100000']);
            context['th2'] = Formula['*/'](context['th'], context['1'], context['2']);
            context['l2'] = Formula['*/'](context['lFD'], context['1'], context['2']);
            context['l3'] = Formula['+-'](context['th2'], context['l2'], context['0']);
            context['rh'] = Formula['+-'](context['hd2'], context['0'], context['th']);
            context['rw'] = Formula['+-'](context['wd2'], context['0'], context['th']);
            context['dr'] = Formula['+-'](context['rw'], context['0'], context['rh']);
            context['maxr'] = Formula['?:'](context['dr'], context['rh'], context['rw']);
            context['ha'] = Formula['at2'](context['maxr'], context['l3']);
            context['aA1'] = Formula['+-'](context['18600000'], context['0'], context['ha']);
            context['aD1'] = Formula['+-'](context['18600000'], context['ha'], context['0']);
            context['ta11'] = Formula['cos'](context['rw'], context['aA1']);
            context['ta12'] = Formula['sin'](context['rh'], context['aA1']);
            context['bA1'] = Formula['at2'](context['ta11'], context['ta12']);
            context['cta1'] = Formula['cos'](context['rh'], context['bA1']);
            context['sta1'] = Formula['sin'](context['rw'], context['bA1']);
            context['ma1'] = Formula['mod'](context['cta1'], context['sta1'], context['0']);
            context['na1'] = Formula['*/'](context['rw'], context['rh'], context['ma1']);
            context['dxa1'] = Formula['cos'](context['na1'], context['bA1']);
            context['dya1'] = Formula['sin'](context['na1'], context['bA1']);
            context['xA1'] = Formula['+-'](context['hc'], context['dxa1'], context['0']);
            context['yA1'] = Formula['+-'](context['vc'], context['dya1'], context['0']);
            context['td11'] = Formula['cos'](context['rw'], context['aD1']);
            context['td12'] = Formula['sin'](context['rh'], context['aD1']);
            context['bD1'] = Formula['at2'](context['td11'], context['td12']);
            context['ctd1'] = Formula['cos'](context['rh'], context['bD1']);
            context['std1'] = Formula['sin'](context['rw'], context['bD1']);
            context['md1'] = Formula['mod'](context['ctd1'], context['std1'], context['0']);
            context['nd1'] = Formula['*/'](context['rw'], context['rh'], context['md1']);
            context['dxd1'] = Formula['cos'](context['nd1'], context['bD1']);
            context['dyd1'] = Formula['sin'](context['nd1'], context['bD1']);
            context['xD1'] = Formula['+-'](context['hc'], context['dxd1'], context['0']);
            context['yD1'] = Formula['+-'](context['vc'], context['dyd1'], context['0']);
            context['xAD1'] = Formula['+-'](context['xA1'], context['0'], context['xD1']);
            context['yAD1'] = Formula['+-'](context['yA1'], context['0'], context['yD1']);
            context['lAD1'] = Formula['mod'](context['xAD1'], context['yAD1'], context['0']);
            context['a1'] = Formula['at2'](context['yAD1'], context['xAD1']);
            context['dxF1'] = Formula['sin'](context['lFD'], context['a1']);
            context['dyF1'] = Formula['cos'](context['lFD'], context['a1']);
            context['xF1'] = Formula['+-'](context['xD1'], context['dxF1'], context['0']);
            context['yF1'] = Formula['+-'](context['yD1'], context['dyF1'], context['0']);
            context['xE1'] = Formula['+-'](context['xA1'], context['0'], context['dxF1']);
            context['yE1'] = Formula['+-'](context['yA1'], context['0'], context['dyF1']);
            context['yC1t'] = Formula['sin'](context['th'], context['a1']);
            context['xC1t'] = Formula['cos'](context['th'], context['a1']);
            context['yC1'] = Formula['+-'](context['yF1'], context['yC1t'], context['0']);
            context['xC1'] = Formula['+-'](context['xF1'], context['0'], context['xC1t']);
            context['yB1'] = Formula['+-'](context['yE1'], context['yC1t'], context['0']);
            context['xB1'] = Formula['+-'](context['xE1'], context['0'], context['xC1t']);
            context['aA2'] = Formula['+-'](context['21000000'], context['0'], context['ha']);
            context['aD2'] = Formula['+-'](context['21000000'], context['ha'], context['0']);
            context['ta21'] = Formula['cos'](context['rw'], context['aA2']);
            context['ta22'] = Formula['sin'](context['rh'], context['aA2']);
            context['bA2'] = Formula['at2'](context['ta21'], context['ta22']);
            context['cta2'] = Formula['cos'](context['rh'], context['bA2']);
            context['sta2'] = Formula['sin'](context['rw'], context['bA2']);
            context['ma2'] = Formula['mod'](context['cta2'], context['sta2'], context['0']);
            context['na2'] = Formula['*/'](context['rw'], context['rh'], context['ma2']);
            context['dxa2'] = Formula['cos'](context['na2'], context['bA2']);
            context['dya2'] = Formula['sin'](context['na2'], context['bA2']);
            context['xA2'] = Formula['+-'](context['hc'], context['dxa2'], context['0']);
            context['yA2'] = Formula['+-'](context['vc'], context['dya2'], context['0']);
            context['td21'] = Formula['cos'](context['rw'], context['aD2']);
            context['td22'] = Formula['sin'](context['rh'], context['aD2']);
            context['bD2'] = Formula['at2'](context['td21'], context['td22']);
            context['ctd2'] = Formula['cos'](context['rh'], context['bD2']);
            context['std2'] = Formula['sin'](context['rw'], context['bD2']);
            context['md2'] = Formula['mod'](context['ctd2'], context['std2'], context['0']);
            context['nd2'] = Formula['*/'](context['rw'], context['rh'], context['md2']);
            context['dxd2'] = Formula['cos'](context['nd2'], context['bD2']);
            context['dyd2'] = Formula['sin'](context['nd2'], context['bD2']);
            context['xD2'] = Formula['+-'](context['hc'], context['dxd2'], context['0']);
            context['yD2'] = Formula['+-'](context['vc'], context['dyd2'], context['0']);
            context['xAD2'] = Formula['+-'](context['xA2'], context['0'], context['xD2']);
            context['yAD2'] = Formula['+-'](context['yA2'], context['0'], context['yD2']);
            context['lAD2'] = Formula['mod'](context['xAD2'], context['yAD2'], context['0']);
            context['a2'] = Formula['at2'](context['yAD2'], context['xAD2']);
            context['dxF2'] = Formula['sin'](context['lFD'], context['a2']);
            context['dyF2'] = Formula['cos'](context['lFD'], context['a2']);
            context['xF2'] = Formula['+-'](context['xD2'], context['dxF2'], context['0']);
            context['yF2'] = Formula['+-'](context['yD2'], context['dyF2'], context['0']);
            context['xE2'] = Formula['+-'](context['xA2'], context['0'], context['dxF2']);
            context['yE2'] = Formula['+-'](context['yA2'], context['0'], context['dyF2']);
            context['yC2t'] = Formula['sin'](context['th'], context['a2']);
            context['xC2t'] = Formula['cos'](context['th'], context['a2']);
            context['yC2'] = Formula['+-'](context['yF2'], context['yC2t'], context['0']);
            context['xC2'] = Formula['+-'](context['xF2'], context['0'], context['xC2t']);
            context['yB2'] = Formula['+-'](context['yE2'], context['yC2t'], context['0']);
            context['xB2'] = Formula['+-'](context['xE2'], context['0'], context['xC2t']);
            context['swAng1'] = Formula['+-'](context['bA2'], context['0'], context['bD1']);
            context['aA3'] = Formula['+-'](context['1800000'], context['0'], context['ha']);
            context['aD3'] = Formula['+-'](context['1800000'], context['ha'], context['0']);
            context['ta31'] = Formula['cos'](context['rw'], context['aA3']);
            context['ta32'] = Formula['sin'](context['rh'], context['aA3']);
            context['bA3'] = Formula['at2'](context['ta31'], context['ta32']);
            context['cta3'] = Formula['cos'](context['rh'], context['bA3']);
            context['sta3'] = Formula['sin'](context['rw'], context['bA3']);
            context['ma3'] = Formula['mod'](context['cta3'], context['sta3'], context['0']);
            context['na3'] = Formula['*/'](context['rw'], context['rh'], context['ma3']);
            context['dxa3'] = Formula['cos'](context['na3'], context['bA3']);
            context['dya3'] = Formula['sin'](context['na3'], context['bA3']);
            context['xA3'] = Formula['+-'](context['hc'], context['dxa3'], context['0']);
            context['yA3'] = Formula['+-'](context['vc'], context['dya3'], context['0']);
            context['td31'] = Formula['cos'](context['rw'], context['aD3']);
            context['td32'] = Formula['sin'](context['rh'], context['aD3']);
            context['bD3'] = Formula['at2'](context['td31'], context['td32']);
            context['ctd3'] = Formula['cos'](context['rh'], context['bD3']);
            context['std3'] = Formula['sin'](context['rw'], context['bD3']);
            context['md3'] = Formula['mod'](context['ctd3'], context['std3'], context['0']);
            context['nd3'] = Formula['*/'](context['rw'], context['rh'], context['md3']);
            context['dxd3'] = Formula['cos'](context['nd3'], context['bD3']);
            context['dyd3'] = Formula['sin'](context['nd3'], context['bD3']);
            context['xD3'] = Formula['+-'](context['hc'], context['dxd3'], context['0']);
            context['yD3'] = Formula['+-'](context['vc'], context['dyd3'], context['0']);
            context['xAD3'] = Formula['+-'](context['xA3'], context['0'], context['xD3']);
            context['yAD3'] = Formula['+-'](context['yA3'], context['0'], context['yD3']);
            context['lAD3'] = Formula['mod'](context['xAD3'], context['yAD3'], context['0']);
            context['a3'] = Formula['at2'](context['yAD3'], context['xAD3']);
            context['dxF3'] = Formula['sin'](context['lFD'], context['a3']);
            context['dyF3'] = Formula['cos'](context['lFD'], context['a3']);
            context['xF3'] = Formula['+-'](context['xD3'], context['dxF3'], context['0']);
            context['yF3'] = Formula['+-'](context['yD3'], context['dyF3'], context['0']);
            context['xE3'] = Formula['+-'](context['xA3'], context['0'], context['dxF3']);
            context['yE3'] = Formula['+-'](context['yA3'], context['0'], context['dyF3']);
            context['yC3t'] = Formula['sin'](context['th'], context['a3']);
            context['xC3t'] = Formula['cos'](context['th'], context['a3']);
            context['yC3'] = Formula['+-'](context['yF3'], context['yC3t'], context['0']);
            context['xC3'] = Formula['+-'](context['xF3'], context['0'], context['xC3t']);
            context['yB3'] = Formula['+-'](context['yE3'], context['yC3t'], context['0']);
            context['xB3'] = Formula['+-'](context['xE3'], context['0'], context['xC3t']);
            context['swAng2'] = Formula['+-'](context['bA3'], context['0'], context['bD2']);
            context['aA4'] = Formula['+-'](context['4200000'], context['0'], context['ha']);
            context['aD4'] = Formula['+-'](context['4200000'], context['ha'], context['0']);
            context['ta41'] = Formula['cos'](context['rw'], context['aA4']);
            context['ta42'] = Formula['sin'](context['rh'], context['aA4']);
            context['bA4'] = Formula['at2'](context['ta41'], context['ta42']);
            context['cta4'] = Formula['cos'](context['rh'], context['bA4']);
            context['sta4'] = Formula['sin'](context['rw'], context['bA4']);
            context['ma4'] = Formula['mod'](context['cta4'], context['sta4'], context['0']);
            context['na4'] = Formula['*/'](context['rw'], context['rh'], context['ma4']);
            context['dxa4'] = Formula['cos'](context['na4'], context['bA4']);
            context['dya4'] = Formula['sin'](context['na4'], context['bA4']);
            context['xA4'] = Formula['+-'](context['hc'], context['dxa4'], context['0']);
            context['yA4'] = Formula['+-'](context['vc'], context['dya4'], context['0']);
            context['td41'] = Formula['cos'](context['rw'], context['aD4']);
            context['td42'] = Formula['sin'](context['rh'], context['aD4']);
            context['bD4'] = Formula['at2'](context['td41'], context['td42']);
            context['ctd4'] = Formula['cos'](context['rh'], context['bD4']);
            context['std4'] = Formula['sin'](context['rw'], context['bD4']);
            context['md4'] = Formula['mod'](context['ctd4'], context['std4'], context['0']);
            context['nd4'] = Formula['*/'](context['rw'], context['rh'], context['md4']);
            context['dxd4'] = Formula['cos'](context['nd4'], context['bD4']);
            context['dyd4'] = Formula['sin'](context['nd4'], context['bD4']);
            context['xD4'] = Formula['+-'](context['hc'], context['dxd4'], context['0']);
            context['yD4'] = Formula['+-'](context['vc'], context['dyd4'], context['0']);
            context['xAD4'] = Formula['+-'](context['xA4'], context['0'], context['xD4']);
            context['yAD4'] = Formula['+-'](context['yA4'], context['0'], context['yD4']);
            context['lAD4'] = Formula['mod'](context['xAD4'], context['yAD4'], context['0']);
            context['a4'] = Formula['at2'](context['yAD4'], context['xAD4']);
            context['dxF4'] = Formula['sin'](context['lFD'], context['a4']);
            context['dyF4'] = Formula['cos'](context['lFD'], context['a4']);
            context['xF4'] = Formula['+-'](context['xD4'], context['dxF4'], context['0']);
            context['yF4'] = Formula['+-'](context['yD4'], context['dyF4'], context['0']);
            context['xE4'] = Formula['+-'](context['xA4'], context['0'], context['dxF4']);
            context['yE4'] = Formula['+-'](context['yA4'], context['0'], context['dyF4']);
            context['yC4t'] = Formula['sin'](context['th'], context['a4']);
            context['xC4t'] = Formula['cos'](context['th'], context['a4']);
            context['yC4'] = Formula['+-'](context['yF4'], context['yC4t'], context['0']);
            context['xC4'] = Formula['+-'](context['xF4'], context['0'], context['xC4t']);
            context['yB4'] = Formula['+-'](context['yE4'], context['yC4t'], context['0']);
            context['xB4'] = Formula['+-'](context['xE4'], context['0'], context['xC4t']);
            context['swAng3'] = Formula['+-'](context['bA4'], context['0'], context['bD3']);
            context['aA5'] = Formula['+-'](context['6600000'], context['0'], context['ha']);
            context['aD5'] = Formula['+-'](context['6600000'], context['ha'], context['0']);
            context['ta51'] = Formula['cos'](context['rw'], context['aA5']);
            context['ta52'] = Formula['sin'](context['rh'], context['aA5']);
            context['bA5'] = Formula['at2'](context['ta51'], context['ta52']);
            context['td51'] = Formula['cos'](context['rw'], context['aD5']);
            context['td52'] = Formula['sin'](context['rh'], context['aD5']);
            context['bD5'] = Formula['at2'](context['td51'], context['td52']);
            context['xD5'] = Formula['+-'](context['w'], context['0'], context['xA4']);
            context['xC5'] = Formula['+-'](context['w'], context['0'], context['xB4']);
            context['xB5'] = Formula['+-'](context['w'], context['0'], context['xC4']);
            context['swAng4'] = Formula['+-'](context['bA5'], context['0'], context['bD4']);
            context['aD6'] = Formula['+-'](context['9000000'], context['ha'], context['0']);
            context['td61'] = Formula['cos'](context['rw'], context['aD6']);
            context['td62'] = Formula['sin'](context['rh'], context['aD6']);
            context['bD6'] = Formula['at2'](context['td61'], context['td62']);
            context['xD6'] = Formula['+-'](context['w'], context['0'], context['xA3']);
            context['xC6'] = Formula['+-'](context['w'], context['0'], context['xB3']);
            context['xB6'] = Formula['+-'](context['w'], context['0'], context['xC3']);
            context['aD7'] = Formula['+-'](context['11400000'], context['ha'], context['0']);
            context['td71'] = Formula['cos'](context['rw'], context['aD7']);
            context['td72'] = Formula['sin'](context['rh'], context['aD7']);
            context['bD7'] = Formula['at2'](context['td71'], context['td72']);
            context['xD7'] = Formula['+-'](context['w'], context['0'], context['xA2']);
            context['xC7'] = Formula['+-'](context['w'], context['0'], context['xB2']);
            context['xB7'] = Formula['+-'](context['w'], context['0'], context['xC2']);
            context['aD8'] = Formula['+-'](context['13800000'], context['ha'], context['0']);
            context['td81'] = Formula['cos'](context['rw'], context['aD8']);
            context['td82'] = Formula['sin'](context['rh'], context['aD8']);
            context['bD8'] = Formula['at2'](context['td81'], context['td82']);
            context['xA8'] = Formula['+-'](context['w'], context['0'], context['xD1']);
            context['xD8'] = Formula['+-'](context['w'], context['0'], context['xA1']);
            context['xC8'] = Formula['+-'](context['w'], context['0'], context['xB1']);
            context['xB8'] = Formula['+-'](context['w'], context['0'], context['xC1']);
            context['aA9'] = Formula['+-'](context['3cd4'], context['0'], context['ha']);
            context['aD9'] = Formula['+-'](context['3cd4'], context['ha'], context['0']);
            context['td91'] = Formula['cos'](context['rw'], context['aD9']);
            context['td92'] = Formula['sin'](context['rh'], context['aD9']);
            context['bD9'] = Formula['at2'](context['td91'], context['td92']);
            context['ctd9'] = Formula['cos'](context['rh'], context['bD9']);
            context['std9'] = Formula['sin'](context['rw'], context['bD9']);
            context['md9'] = Formula['mod'](context['ctd9'], context['std9'], context['0']);
            context['nd9'] = Formula['*/'](context['rw'], context['rh'], context['md9']);
            context['dxd9'] = Formula['cos'](context['nd9'], context['bD9']);
            context['dyd9'] = Formula['sin'](context['nd9'], context['bD9']);
            context['xD9'] = Formula['+-'](context['hc'], context['dxd9'], context['0']);
            context['yD9'] = Formula['+-'](context['vc'], context['dyd9'], context['0']);
            context['ta91'] = Formula['cos'](context['rw'], context['aA9']);
            context['ta92'] = Formula['sin'](context['rh'], context['aA9']);
            context['bA9'] = Formula['at2'](context['ta91'], context['ta92']);
            context['xA9'] = Formula['+-'](context['hc'], context['0'], context['dxd9']);
            context['xF9'] = Formula['+-'](context['xD9'], context['0'], context['lFD']);
            context['xE9'] = Formula['+-'](context['xA9'], context['lFD'], context['0']);
            context['yC9'] = Formula['+-'](context['yD9'], context['0'], context['th']);
            context['swAng5'] = Formula['+-'](context['bA9'], context['0'], context['bD8']);
            context['xCxn1'] = Formula['+/'](context['xB1'], context['xC1'], context['2']);
            context['yCxn1'] = Formula['+/'](context['yB1'], context['yC1'], context['2']);
            context['xCxn2'] = Formula['+/'](context['xB2'], context['xC2'], context['2']);
            context['yCxn2'] = Formula['+/'](context['yB2'], context['yC2'], context['2']);
            context['xCxn3'] = Formula['+/'](context['xB3'], context['xC3'], context['2']);
            context['yCxn3'] = Formula['+/'](context['yB3'], context['yC3'], context['2']);
            context['xCxn4'] = Formula['+/'](context['xB4'], context['xC4'], context['2']);
            context['yCxn4'] = Formula['+/'](context['yB4'], context['yC4'], context['2']);
            context['xCxn5'] = Formula['+/'](context['r'], context['0'], context['xCxn4']);
            context['xCxn6'] = Formula['+/'](context['r'], context['0'], context['xCxn3']);
            context['xCxn7'] = Formula['+/'](context['r'], context['0'], context['xCxn2']);
            context['xCxn8'] = Formula['+/'](context['r'], context['0'], context['xCxn1']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['xA1'], context['yA1'])} ${lineTo(
                            context,
                            context['xB1'],
                            context['yB1']
                        )} ${lineTo(context, context['xC1'], context['yC1'])} ${lineTo(
                            context,
                            context['xD1'],
                            context['yD1']
                        )} ${arcTo(
                            context,
                            context['rw'],
                            context['rh'],
                            context['bD1'],
                            context['swAng1']
                        )} ${lineTo(context, context['xB2'], context['yB2'])} ${lineTo(
                            context,
                            context['xC2'],
                            context['yC2']
                        )} ${lineTo(context, context['xD2'], context['yD2'])} ${arcTo(
                            context,
                            context['rw'],
                            context['rh'],
                            context['bD2'],
                            context['swAng2']
                        )} ${lineTo(context, context['xB3'], context['yB3'])} ${lineTo(
                            context,
                            context['xC3'],
                            context['yC3']
                        )} ${lineTo(context, context['xD3'], context['yD3'])} ${arcTo(
                            context,
                            context['rw'],
                            context['rh'],
                            context['bD3'],
                            context['swAng3']
                        )} ${lineTo(context, context['xB4'], context['yB4'])} ${lineTo(
                            context,
                            context['xC4'],
                            context['yC4']
                        )} ${lineTo(context, context['xD4'], context['yD4'])} ${arcTo(
                            context,
                            context['rw'],
                            context['rh'],
                            context['bD4'],
                            context['swAng4']
                        )} ${lineTo(context, context['xB5'], context['yC4'])} ${lineTo(
                            context,
                            context['xC5'],
                            context['yB4']
                        )} ${lineTo(context, context['xD5'], context['yA4'])} ${arcTo(
                            context,
                            context['rw'],
                            context['rh'],
                            context['bD5'],
                            context['swAng3']
                        )} ${lineTo(context, context['xB6'], context['yC3'])} ${lineTo(
                            context,
                            context['xC6'],
                            context['yB3']
                        )} ${lineTo(context, context['xD6'], context['yA3'])} ${arcTo(
                            context,
                            context['rw'],
                            context['rh'],
                            context['bD6'],
                            context['swAng2']
                        )} ${lineTo(context, context['xB7'], context['yC2'])} ${lineTo(
                            context,
                            context['xC7'],
                            context['yB2']
                        )} ${lineTo(context, context['xD7'], context['yA2'])} ${arcTo(
                            context,
                            context['rw'],
                            context['rh'],
                            context['bD7'],
                            context['swAng1']
                        )} ${lineTo(context, context['xB8'], context['yC1'])} ${lineTo(
                            context,
                            context['xC8'],
                            context['yB1']
                        )} ${lineTo(context, context['xD8'], context['yA1'])} ${arcTo(
                            context,
                            context['rw'],
                            context['rh'],
                            context['bD8'],
                            context['swAng5']
                        )} ${lineTo(context, context['xE9'], context['yC9'])} ${lineTo(
                            context,
                            context['xF9'],
                            context['yC9']
                        )} ${lineTo(context, context['xD9'], context['yD9'])} ${arcTo(
                            context,
                            context['rw'],
                            context['rh'],
                            context['bD9'],
                            context['swAng5']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.HALF_FRAME]: {
        editable: true,
        defaultValue: [33333, 33333],
        defaultKey: ['adj1', 'adj2'],
        formula: (width: number, height: number, [adj1, adj2]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;

            context['maxAdj2'] = Formula['*/'](context['100000'], context['w'], context['ss']);
            context['a2'] = Formula['pin'](context['0'], context['adj2'], context['maxAdj2']);
            context['x1'] = Formula['*/'](context['ss'], context['a2'], context['100000']);
            context['g1'] = Formula['*/'](context['h'], context['x1'], context['w']);
            context['g2'] = Formula['+-'](context['h'], context['0'], context['g1']);
            context['maxAdj1'] = Formula['*/'](context['100000'], context['g2'], context['ss']);
            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['maxAdj1']);
            context['y1'] = Formula['*/'](context['ss'], context['a1'], context['100000']);
            context['dx2'] = Formula['*/'](context['y1'], context['w'], context['h']);
            context['x2'] = Formula['+-'](context['r'], context['0'], context['dx2']);
            context['dy2'] = Formula['*/'](context['x1'], context['h'], context['w']);
            context['y2'] = Formula['+-'](context['b'], context['0'], context['dy2']);
            context['cx1'] = Formula['*/'](context['x1'], context['1'], context['2']);
            context['cy1'] = Formula['+/'](context['y2'], context['b'], context['2']);
            context['cx2'] = Formula['+/'](context['x2'], context['r'], context['2']);
            context['cy2'] = Formula['*/'](context['y1'], context['1'], context['2']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['t']
                        )} ${lineTo(context, context['x2'], context['y1'])} ${lineTo(
                            context,
                            context['x1'],
                            context['y1']
                        )} ${lineTo(context, context['x1'], context['y2'])} ${lineTo(
                            context,
                            context['l'],
                            context['b']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.HEART]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            context['dx1'] = Formula['*/'](context['w'], context['49'], context['48']);
            context['dx2'] = Formula['*/'](context['w'], context['10'], context['48']);
            context['x1'] = Formula['+-'](context['hc'], context['0'], context['dx1']);
            context['x2'] = Formula['+-'](context['hc'], context['0'], context['dx2']);
            context['x3'] = Formula['+-'](context['hc'], context['dx2'], context['0']);
            context['x4'] = Formula['+-'](context['hc'], context['dx1'], context['0']);
            context['y1'] = Formula['+-'](context['t'], context['0'], context['hd3']);
            context['il'] = Formula['*/'](context['w'], context['1'], context['6']);
            context['ir'] = Formula['*/'](context['w'], context['5'], context['6']);
            context['ib'] = Formula['*/'](context['h'], context['2'], context['3']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['hc'], context['hd4'])} ${cubicBezTo(
                            context,
                            context['x3'],
                            context['y1'],
                            context['x4'],
                            context['hd4'],
                            context['hc'],
                            context['b']
                        )} ${cubicBezTo(
                            context,
                            context['x1'],
                            context['hd4'],
                            context['x2'],
                            context['y1'],
                            context['hc'],
                            context['hd4']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.HEPTAGON]: {
        editable: true,
        defaultValue: [102572, 105210],
        defaultKey: ['hf', 'vf'],
        formula: (width: number, height: number, [hf, vf]: number[]) => {
            const context = getContext(width, height);
            context['hf'] = hf;
            context['vf'] = vf;

            context['swd2'] = Formula['*/'](context['wd2'], context['hf'], context['100000']);
            context['shd2'] = Formula['*/'](context['hd2'], context['vf'], context['100000']);
            context['svc'] = Formula['*/'](context['vc'], context['vf'], context['100000']);
            context['dx1'] = Formula['*/'](context['swd2'], context['97493'], context['100000']);
            context['dx2'] = Formula['*/'](context['swd2'], context['78183'], context['100000']);
            context['dx3'] = Formula['*/'](context['swd2'], context['43388'], context['100000']);
            context['dy1'] = Formula['*/'](context['shd2'], context['62349'], context['100000']);
            context['dy2'] = Formula['*/'](context['shd2'], context['22252'], context['100000']);
            context['dy3'] = Formula['*/'](context['shd2'], context['90097'], context['100000']);
            context['x1'] = Formula['+-'](context['hc'], context['0'], context['dx1']);
            context['x2'] = Formula['+-'](context['hc'], context['0'], context['dx2']);
            context['x3'] = Formula['+-'](context['hc'], context['0'], context['dx3']);
            context['x4'] = Formula['+-'](context['hc'], context['dx3'], context['0']);
            context['x5'] = Formula['+-'](context['hc'], context['dx2'], context['0']);
            context['x6'] = Formula['+-'](context['hc'], context['dx1'], context['0']);
            context['y1'] = Formula['+-'](context['svc'], context['0'], context['dy1']);
            context['y2'] = Formula['+-'](context['svc'], context['dy2'], context['0']);
            context['y3'] = Formula['+-'](context['svc'], context['dy3'], context['0']);
            context['ib'] = Formula['+-'](context['b'], context['0'], context['y1']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['x1'], context['y2'])} ${lineTo(
                            context,
                            context['x2'],
                            context['y1']
                        )} ${lineTo(context, context['hc'], context['t'])} ${lineTo(
                            context,
                            context['x5'],
                            context['y1']
                        )} ${lineTo(context, context['x6'], context['y2'])} ${lineTo(
                            context,
                            context['x4'],
                            context['y3']
                        )} ${lineTo(context, context['x3'], context['y3'])} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.HEXAGON]: {
        editable: true,
        defaultValue: [25000, 115470],
        defaultKey: ['adj', 'vf'],
        formula: (width: number, height: number, [adj, vf]: number[]) => {
            const context = getContext(width, height);
            context['adj'] = adj;
            context['vf'] = vf;

            context['maxAdj'] = Formula['*/'](context['50000'], context['w'], context['ss']);
            context['a'] = Formula['pin'](context['0'], context['adj'], context['maxAdj']);
            context['shd2'] = Formula['*/'](context['hd2'], context['vf'], context['100000']);
            context['x1'] = Formula['*/'](context['ss'], context['a'], context['100000']);
            context['x2'] = Formula['+-'](context['r'], context['0'], context['x1']);
            context['dy1'] = Formula['sin'](context['shd2'], context['3600000']);
            context['y1'] = Formula['+-'](context['vc'], context['0'], context['dy1']);
            context['y2'] = Formula['+-'](context['vc'], context['dy1'], context['0']);
            context['q1'] = Formula['*/'](context['maxAdj'], context['-1'], context['2']);
            context['q2'] = Formula['+-'](context['a'], context['q1'], context['0']);
            context['q3'] = Formula['?:'](context['q2'], context['4'], context['2']);
            context['q4'] = Formula['?:'](context['q2'], context['3'], context['2']);
            context['q5'] = Formula['?:'](context['q2'], context['q1'], context['0']);
            context['q6'] = Formula['+/'](context['a'], context['q5'], context['q1']);
            context['q7'] = Formula['*/'](context['q6'], context['q4'], context['-1']);
            context['q8'] = Formula['+-'](context['q3'], context['q7'], context['0']);
            context['il'] = Formula['*/'](context['w'], context['q8'], context['24']);
            context['it'] = Formula['*/'](context['h'], context['q8'], context['24']);
            context['ir'] = Formula['+-'](context['r'], context['0'], context['il']);
            context['ib'] = Formula['+-'](context['b'], context['0'], context['it']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['vc'])} ${lineTo(
                            context,
                            context['x1'],
                            context['y1']
                        )} ${lineTo(context, context['x2'], context['y1'])} ${lineTo(
                            context,
                            context['r'],
                            context['vc']
                        )} ${lineTo(context, context['x2'], context['y2'])} ${lineTo(
                            context,
                            context['x1'],
                            context['y2']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.HOME_PLATE]: {
        editable: true,
        defaultValue: [50000],
        defaultKey: ['adj'],
        formula: (width: number, height: number, [adj]: number[]) => {
            const context = getContext(width, height);
            context['adj'] = adj;

            context['maxAdj'] = Formula['*/'](context['100000'], context['w'], context['ss']);
            context['a'] = Formula['pin'](context['0'], context['adj'], context['maxAdj']);
            context['dx1'] = Formula['*/'](context['ss'], context['a'], context['100000']);
            context['x1'] = Formula['+-'](context['r'], context['0'], context['dx1']);
            context['ir'] = Formula['+/'](context['x1'], context['r'], context['2']);
            context['x2'] = Formula['*/'](context['x1'], context['1'], context['2']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['x1'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['vc'])} ${lineTo(
                            context,
                            context['x1'],
                            context['b']
                        )} ${lineTo(context, context['l'], context['b'])} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.HORIZONTAL_SCROLL]: {
        editable: true,
        defaultValue: [12500],
        defaultKey: ['adj'],
        formula: (width: number, height: number, [adj]: number[]) => {
            const context = getContext(width, height);
            context['adj'] = adj;

            context['a'] = Formula['pin'](context['0'], context['adj'], context['25000']);
            context['ch'] = Formula['*/'](context['ss'], context['a'], context['100000']);
            context['ch2'] = Formula['*/'](context['ch'], context['1'], context['2']);
            context['ch4'] = Formula['*/'](context['ch'], context['1'], context['4']);
            context['y3'] = Formula['+-'](context['ch'], context['ch2'], context['0']);
            context['y4'] = Formula['+-'](context['ch'], context['ch'], context['0']);
            context['y6'] = Formula['+-'](context['b'], context['0'], context['ch']);
            context['y7'] = Formula['+-'](context['b'], context['0'], context['ch2']);
            context['y5'] = Formula['+-'](context['y6'], context['0'], context['ch2']);
            context['x3'] = Formula['+-'](context['r'], context['0'], context['ch']);
            context['x4'] = Formula['+-'](context['r'], context['0'], context['ch2']);

            return [
                {
                    d: path(context, { stroke: 'false', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['r'], context['ch2'])} ${arcTo(
                            context,
                            context['ch2'],
                            context['ch2'],
                            context['0'],
                            context['cd4']
                        )} ${lineTo(context, context['x4'], context['ch2'])} ${arcTo(
                            context,
                            context['ch4'],
                            context['ch4'],
                            context['0'],
                            context['cd2']
                        )} ${lineTo(context, context['x3'], context['ch'])} ${lineTo(
                            context,
                            context['ch2'],
                            context['ch']
                        )} ${arcTo(
                            context,
                            context['ch2'],
                            context['ch2'],
                            context['3cd4'],
                            context['-5400000']
                        )} ${lineTo(context, context['l'], context['y7'])} ${arcTo(
                            context,
                            context['ch2'],
                            context['ch2'],
                            context['cd2'],
                            context['-10800000']
                        )} ${lineTo(context, context['ch'], context['y6'])} ${lineTo(
                            context,
                            context['x4'],
                            context['y6']
                        )} ${arcTo(
                            context,
                            context['ch2'],
                            context['ch2'],
                            context['cd4'],
                            context['-5400000']
                        )} ${close(context)} ${moveTo(
                            context,
                            context['ch2'],
                            context['y4']
                        )} ${arcTo(
                            context,
                            context['ch2'],
                            context['ch2'],
                            context['cd4'],
                            context['-5400000']
                        )} ${arcTo(
                            context,
                            context['ch4'],
                            context['ch4'],
                            context['0'],
                            context['-10800000']
                        )} ${close(context)}`;
                    }),
                    attrs: { stroke: 'false', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(
                        context,
                        { fill: 'darkenLess', stroke: 'false', extrusionOk: 'false' },
                        () => {
                            return `${moveTo(context, context['ch2'], context['y4'])} ${arcTo(
                                context,
                                context['ch2'],
                                context['ch2'],
                                context['cd4'],
                                context['-5400000']
                            )} ${arcTo(
                                context,
                                context['ch4'],
                                context['ch4'],
                                context['0'],
                                context['-10800000']
                            )} ${close(context)} ${moveTo(
                                context,
                                context['x4'],
                                context['ch']
                            )} ${arcTo(
                                context,
                                context['ch2'],
                                context['ch2'],
                                context['cd4'],
                                context['-16200000']
                            )} ${arcTo(
                                context,
                                context['ch4'],
                                context['ch4'],
                                context['cd2'],
                                context['-10800000']
                            )} ${close(context)}`;
                        }
                    ),
                    attrs: { fill: 'darkenLess', stroke: 'false', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['l'], context['y3'])} ${arcTo(
                            context,
                            context['ch2'],
                            context['ch2'],
                            context['cd2'],
                            context['cd4']
                        )} ${lineTo(context, context['x3'], context['ch'])} ${lineTo(
                            context,
                            context['x3'],
                            context['ch2']
                        )} ${arcTo(
                            context,
                            context['ch2'],
                            context['ch2'],
                            context['cd2'],
                            context['cd2']
                        )} ${lineTo(context, context['r'], context['y5'])} ${arcTo(
                            context,
                            context['ch2'],
                            context['ch2'],
                            context['0'],
                            context['cd4']
                        )} ${lineTo(context, context['ch'], context['y6'])} ${lineTo(
                            context,
                            context['ch'],
                            context['y7']
                        )} ${arcTo(
                            context,
                            context['ch2'],
                            context['ch2'],
                            context['0'],
                            context['cd2']
                        )} ${close(context)} ${moveTo(
                            context,
                            context['x3'],
                            context['ch']
                        )} ${lineTo(context, context['x4'], context['ch'])} ${arcTo(
                            context,
                            context['ch2'],
                            context['ch2'],
                            context['cd4'],
                            context['-5400000']
                        )} ${moveTo(context, context['x4'], context['ch'])} ${lineTo(
                            context,
                            context['x4'],
                            context['ch2']
                        )} ${arcTo(
                            context,
                            context['ch4'],
                            context['ch4'],
                            context['0'],
                            context['cd2']
                        )} ${moveTo(context, context['ch2'], context['y4'])} ${lineTo(
                            context,
                            context['ch2'],
                            context['y3']
                        )} ${arcTo(
                            context,
                            context['ch4'],
                            context['ch4'],
                            context['cd2'],
                            context['cd2']
                        )} ${arcTo(
                            context,
                            context['ch2'],
                            context['ch2'],
                            context['0'],
                            context['cd2']
                        )} ${moveTo(context, context['ch'], context['y3'])} ${lineTo(
                            context,
                            context['ch'],
                            context['y6']
                        )}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.IRREGULAR_SEAL1]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            context['x5'] = Formula['*/'](context['w'], context['4627'], context['21600']);
            context['x12'] = Formula['*/'](context['w'], context['8485'], context['21600']);
            context['x21'] = Formula['*/'](context['w'], context['16702'], context['21600']);
            context['x24'] = Formula['*/'](context['w'], context['14522'], context['21600']);
            context['y3'] = Formula['*/'](context['h'], context['6320'], context['21600']);
            context['y6'] = Formula['*/'](context['h'], context['8615'], context['21600']);
            context['y9'] = Formula['*/'](context['h'], context['13937'], context['21600']);
            context['y18'] = Formula['*/'](context['h'], context['13290'], context['21600']);

            return [
                {
                    d: path(context, { w: 21600, h: 21600 }, () => {
                        return `${moveTo(context, context['10800'], context['5800'])} ${lineTo(
                            context,
                            context['14522'],
                            context['0']
                        )} ${lineTo(context, context['14155'], context['5325'])} ${lineTo(
                            context,
                            context['18380'],
                            context['4457']
                        )} ${lineTo(context, context['16702'], context['7315'])} ${lineTo(
                            context,
                            context['21097'],
                            context['8137']
                        )} ${lineTo(context, context['17607'], context['10475'])} ${lineTo(
                            context,
                            context['21600'],
                            context['13290']
                        )} ${lineTo(context, context['16837'], context['12942'])} ${lineTo(
                            context,
                            context['18145'],
                            context['18095']
                        )} ${lineTo(context, context['14020'], context['14457'])} ${lineTo(
                            context,
                            context['13247'],
                            context['19737']
                        )} ${lineTo(context, context['10532'], context['14935'])} ${lineTo(
                            context,
                            context['8485'],
                            context['21600']
                        )} ${lineTo(context, context['7715'], context['15627'])} ${lineTo(
                            context,
                            context['4762'],
                            context['17617']
                        )} ${lineTo(context, context['5667'], context['13937'])} ${lineTo(
                            context,
                            context['135'],
                            context['14587']
                        )} ${lineTo(context, context['3722'], context['11775'])} ${lineTo(
                            context,
                            context['0'],
                            context['8615']
                        )} ${lineTo(context, context['4627'], context['7617'])} ${lineTo(
                            context,
                            context['370'],
                            context['2295']
                        )} ${lineTo(context, context['7312'], context['6320'])} ${lineTo(
                            context,
                            context['8352'],
                            context['2295']
                        )} ${close(context)}`;
                    }),
                    attrs: { w: 21600, h: 21600 },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.IRREGULAR_SEAL2]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            context['x2'] = Formula['*/'](context['w'], context['9722'], context['21600']);
            context['x5'] = Formula['*/'](context['w'], context['5372'], context['21600']);
            context['x16'] = Formula['*/'](context['w'], context['11612'], context['21600']);
            context['x19'] = Formula['*/'](context['w'], context['14640'], context['21600']);
            context['y2'] = Formula['*/'](context['h'], context['1887'], context['21600']);
            context['y3'] = Formula['*/'](context['h'], context['6382'], context['21600']);
            context['y8'] = Formula['*/'](context['h'], context['12877'], context['21600']);
            context['y14'] = Formula['*/'](context['h'], context['19712'], context['21600']);
            context['y16'] = Formula['*/'](context['h'], context['18842'], context['21600']);
            context['y17'] = Formula['*/'](context['h'], context['15935'], context['21600']);
            context['y24'] = Formula['*/'](context['h'], context['6645'], context['21600']);

            return [
                {
                    d: path(context, { w: 21600, h: 21600 }, () => {
                        return `${moveTo(context, context['11462'], context['4342'])} ${lineTo(
                            context,
                            context['14790'],
                            context['0']
                        )} ${lineTo(context, context['14525'], context['5777'])} ${lineTo(
                            context,
                            context['18007'],
                            context['3172']
                        )} ${lineTo(context, context['16380'], context['6532'])} ${lineTo(
                            context,
                            context['21600'],
                            context['6645']
                        )} ${lineTo(context, context['16985'], context['9402'])} ${lineTo(
                            context,
                            context['18270'],
                            context['11290']
                        )} ${lineTo(context, context['16380'], context['12310'])} ${lineTo(
                            context,
                            context['18877'],
                            context['15632']
                        )} ${lineTo(context, context['14640'], context['14350'])} ${lineTo(
                            context,
                            context['14942'],
                            context['17370']
                        )} ${lineTo(context, context['12180'], context['15935'])} ${lineTo(
                            context,
                            context['11612'],
                            context['18842']
                        )} ${lineTo(context, context['9872'], context['17370'])} ${lineTo(
                            context,
                            context['8700'],
                            context['19712']
                        )} ${lineTo(context, context['7527'], context['18125'])} ${lineTo(
                            context,
                            context['4917'],
                            context['21600']
                        )} ${lineTo(context, context['4805'], context['18240'])} ${lineTo(
                            context,
                            context['1285'],
                            context['17825']
                        )} ${lineTo(context, context['3330'], context['15370'])} ${lineTo(
                            context,
                            context['0'],
                            context['12877']
                        )} ${lineTo(context, context['3935'], context['11592'])} ${lineTo(
                            context,
                            context['1172'],
                            context['8270']
                        )} ${lineTo(context, context['5372'], context['7817'])} ${lineTo(
                            context,
                            context['4502'],
                            context['3625']
                        )} ${lineTo(context, context['8550'], context['6382'])} ${lineTo(
                            context,
                            context['9722'],
                            context['1887']
                        )} ${close(context)}`;
                    }),
                    attrs: { w: 21600, h: 21600 },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.LEFT_ARROW]: {
        editable: true,
        defaultValue: [50000, 50000],
        defaultKey: ['adj1', 'adj2'],
        formula: (width: number, height: number, [adj1, adj2]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;

            context['maxAdj2'] = Formula['*/'](context['100000'], context['w'], context['ss']);
            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['100000']);
            context['a2'] = Formula['pin'](context['0'], context['adj2'], context['maxAdj2']);
            context['dx2'] = Formula['*/'](context['ss'], context['a2'], context['100000']);
            context['x2'] = Formula['+-'](context['l'], context['dx2'], context['0']);
            context['dy1'] = Formula['*/'](context['h'], context['a1'], context['200000']);
            context['y1'] = Formula['+-'](context['vc'], context['0'], context['dy1']);
            context['y2'] = Formula['+-'](context['vc'], context['dy1'], context['0']);
            context['dx1'] = Formula['*/'](context['y1'], context['dx2'], context['hd2']);
            context['x1'] = Formula['+-'](context['x2'], context['0'], context['dx1']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['vc'])} ${lineTo(
                            context,
                            context['x2'],
                            context['t']
                        )} ${lineTo(context, context['x2'], context['y1'])} ${lineTo(
                            context,
                            context['r'],
                            context['y1']
                        )} ${lineTo(context, context['r'], context['y2'])} ${lineTo(
                            context,
                            context['x2'],
                            context['y2']
                        )} ${lineTo(context, context['x2'], context['b'])} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.LEFT_ARROW_CALLOUT]: {
        editable: true,
        defaultValue: [25000, 25000, 25000, 64977],
        defaultKey: ['adj1', 'adj2', 'adj3', 'adj4'],
        formula: (width: number, height: number, [adj1, adj2, adj3, adj4]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;
            context['adj3'] = adj3;
            context['adj4'] = adj4;

            context['maxAdj2'] = Formula['*/'](context['50000'], context['h'], context['ss']);
            context['a2'] = Formula['pin'](context['0'], context['adj2'], context['maxAdj2']);
            context['maxAdj1'] = Formula['*/'](context['a2'], context['2'], context['1']);
            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['maxAdj1']);
            context['maxAdj3'] = Formula['*/'](context['100000'], context['w'], context['ss']);
            context['a3'] = Formula['pin'](context['0'], context['adj3'], context['maxAdj3']);
            context['q2'] = Formula['*/'](context['a3'], context['ss'], context['w']);
            context['maxAdj4'] = Formula['+-'](context['100000'], context['0'], context['q2']);
            context['a4'] = Formula['pin'](context['0'], context['adj4'], context['maxAdj4']);
            context['dy1'] = Formula['*/'](context['ss'], context['a2'], context['100000']);
            context['dy2'] = Formula['*/'](context['ss'], context['a1'], context['200000']);
            context['y1'] = Formula['+-'](context['vc'], context['0'], context['dy1']);
            context['y2'] = Formula['+-'](context['vc'], context['0'], context['dy2']);
            context['y3'] = Formula['+-'](context['vc'], context['dy2'], context['0']);
            context['y4'] = Formula['+-'](context['vc'], context['dy1'], context['0']);
            context['x1'] = Formula['*/'](context['ss'], context['a3'], context['100000']);
            context['dx2'] = Formula['*/'](context['w'], context['a4'], context['100000']);
            context['x2'] = Formula['+-'](context['r'], context['0'], context['dx2']);
            context['x3'] = Formula['+/'](context['x2'], context['r'], context['2']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['vc'])} ${lineTo(
                            context,
                            context['x1'],
                            context['y1']
                        )} ${lineTo(context, context['x1'], context['y2'])} ${lineTo(
                            context,
                            context['x2'],
                            context['y2']
                        )} ${lineTo(context, context['x2'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['b'])} ${lineTo(
                            context,
                            context['x2'],
                            context['b']
                        )} ${lineTo(context, context['x2'], context['y3'])} ${lineTo(
                            context,
                            context['x1'],
                            context['y3']
                        )} ${lineTo(context, context['x1'], context['y4'])} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.LEFT_BRACE]: {
        editable: true,
        defaultValue: [8333, 50000],
        defaultKey: ['adj1', 'adj2'],
        formula: (width: number, height: number, [adj1, adj2]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;

            context['a2'] = Formula['pin'](context['0'], context['adj2'], context['100000']);
            context['q1'] = Formula['+-'](context['100000'], context['0'], context['a2']);
            context['q2'] = Formula['min'](context['q1'], context['a2']);
            context['q3'] = Formula['*/'](context['q2'], context['1'], context['2']);
            context['maxAdj1'] = Formula['*/'](context['q3'], context['h'], context['ss']);
            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['maxAdj1']);
            context['y1'] = Formula['*/'](context['ss'], context['a1'], context['100000']);
            context['y3'] = Formula['*/'](context['h'], context['a2'], context['100000']);
            context['y4'] = Formula['+-'](context['y3'], context['y1'], context['0']);
            context['dx1'] = Formula['cos'](context['wd2'], context['2700000']);
            context['dy1'] = Formula['sin'](context['y1'], context['2700000']);
            context['il'] = Formula['+-'](context['r'], context['0'], context['dx1']);
            context['it'] = Formula['+-'](context['y1'], context['0'], context['dy1']);
            context['ib'] = Formula['+-'](context['b'], context['dy1'], context['y1']);

            return [
                {
                    d: path(context, { stroke: 'false', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['r'], context['b'])} ${arcTo(
                            context,
                            context['wd2'],
                            context['y1'],
                            context['cd4'],
                            context['cd4']
                        )} ${lineTo(context, context['hc'], context['y4'])} ${arcTo(
                            context,
                            context['wd2'],
                            context['y1'],
                            context['0'],
                            context['-5400000']
                        )} ${arcTo(
                            context,
                            context['wd2'],
                            context['y1'],
                            context['cd4'],
                            context['-5400000']
                        )} ${lineTo(context, context['hc'], context['y1'])} ${arcTo(
                            context,
                            context['wd2'],
                            context['y1'],
                            context['cd2'],
                            context['cd4']
                        )} ${close(context)}`;
                    }),
                    attrs: { stroke: 'false', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none' }, () => {
                        return `${moveTo(context, context['r'], context['b'])} ${arcTo(
                            context,
                            context['wd2'],
                            context['y1'],
                            context['cd4'],
                            context['cd4']
                        )} ${lineTo(context, context['hc'], context['y4'])} ${arcTo(
                            context,
                            context['wd2'],
                            context['y1'],
                            context['0'],
                            context['-5400000']
                        )} ${arcTo(
                            context,
                            context['wd2'],
                            context['y1'],
                            context['cd4'],
                            context['-5400000']
                        )} ${lineTo(context, context['hc'], context['y1'])} ${arcTo(
                            context,
                            context['wd2'],
                            context['y1'],
                            context['cd2'],
                            context['cd4']
                        )}`;
                    }),
                    attrs: { fill: 'none' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.LEFT_BRACKET]: {
        editable: true,
        defaultValue: [8333],
        defaultKey: ['adj'],
        formula: (width: number, height: number, [adj]: number[]) => {
            const context = getContext(width, height);
            context['adj'] = adj;

            context['maxAdj'] = Formula['*/'](context['50000'], context['h'], context['ss']);
            context['a'] = Formula['pin'](context['0'], context['adj'], context['maxAdj']);
            context['y1'] = Formula['*/'](context['ss'], context['a'], context['100000']);
            context['y2'] = Formula['+-'](context['b'], context['0'], context['y1']);
            context['dx1'] = Formula['cos'](context['w'], context['2700000']);
            context['dy1'] = Formula['sin'](context['y1'], context['2700000']);
            context['il'] = Formula['+-'](context['r'], context['0'], context['dx1']);
            context['it'] = Formula['+-'](context['y1'], context['0'], context['dy1']);
            context['ib'] = Formula['+-'](context['b'], context['dy1'], context['y1']);

            return [
                {
                    d: path(context, { stroke: 'false', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['r'], context['b'])} ${arcTo(
                            context,
                            context['w'],
                            context['y1'],
                            context['cd4'],
                            context['cd4']
                        )} ${lineTo(context, context['l'], context['y1'])} ${arcTo(
                            context,
                            context['w'],
                            context['y1'],
                            context['cd2'],
                            context['cd4']
                        )} ${close(context)}`;
                    }),
                    attrs: { stroke: 'false', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none' }, () => {
                        return `${moveTo(context, context['r'], context['b'])} ${arcTo(
                            context,
                            context['w'],
                            context['y1'],
                            context['cd4'],
                            context['cd4']
                        )} ${lineTo(context, context['l'], context['y1'])} ${arcTo(
                            context,
                            context['w'],
                            context['y1'],
                            context['cd2'],
                            context['cd4']
                        )}`;
                    }),
                    attrs: { fill: 'none' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.LEFT_CIRCULAR_ARROW]: {
        editable: true,
        defaultValue: [12500, -1142319, 1142319, 10800000, 12500],
        defaultKey: ['adj1', 'adj2', 'adj3', 'adj4', 'adj5'],
        formula: (width: number, height: number, [adj1, adj2, adj3, adj4, adj5]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;
            context['adj3'] = adj3;
            context['adj4'] = adj4;
            context['adj5'] = adj5;

            context['a5'] = Formula['pin'](context['0'], context['adj5'], context['25000']);
            context['maxAdj1'] = Formula['*/'](context['a5'], context['2'], context['1']);
            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['maxAdj1']);
            context['enAng'] = Formula['pin'](context['1'], context['adj3'], context['21599999']);
            context['stAng'] = Formula['pin'](context['0'], context['adj4'], context['21599999']);
            context['th'] = Formula['*/'](context['ss'], context['a1'], context['100000']);
            context['thh'] = Formula['*/'](context['ss'], context['a5'], context['100000']);
            context['th2'] = Formula['*/'](context['th'], context['1'], context['2']);
            context['rw1'] = Formula['+-'](context['wd2'], context['th2'], context['thh']);
            context['rh1'] = Formula['+-'](context['hd2'], context['th2'], context['thh']);
            context['rw2'] = Formula['+-'](context['rw1'], context['0'], context['th']);
            context['rh2'] = Formula['+-'](context['rh1'], context['0'], context['th']);
            context['rw3'] = Formula['+-'](context['rw2'], context['th2'], context['0']);
            context['rh3'] = Formula['+-'](context['rh2'], context['th2'], context['0']);
            context['wtH'] = Formula['sin'](context['rw3'], context['enAng']);
            context['htH'] = Formula['cos'](context['rh3'], context['enAng']);
            context['dxH'] = Formula['cat2'](context['rw3'], context['htH'], context['wtH']);
            context['dyH'] = Formula['sat2'](context['rh3'], context['htH'], context['wtH']);
            context['xH'] = Formula['+-'](context['hc'], context['dxH'], context['0']);
            context['yH'] = Formula['+-'](context['vc'], context['dyH'], context['0']);
            context['rI'] = Formula['min'](context['rw2'], context['rh2']);
            context['u1'] = Formula['*/'](context['dxH'], context['dxH'], context['1']);
            context['u2'] = Formula['*/'](context['dyH'], context['dyH'], context['1']);
            context['u3'] = Formula['*/'](context['rI'], context['rI'], context['1']);
            context['u4'] = Formula['+-'](context['u1'], context['0'], context['u3']);
            context['u5'] = Formula['+-'](context['u2'], context['0'], context['u3']);
            context['u6'] = Formula['*/'](context['u4'], context['u5'], context['u1']);
            context['u7'] = Formula['*/'](context['u6'], context['1'], context['u2']);
            context['u8'] = Formula['+-'](context['1'], context['0'], context['u7']);
            context['u9'] = Formula['sqrt'](context['u8']);
            context['u10'] = Formula['*/'](context['u4'], context['1'], context['dxH']);
            context['u11'] = Formula['*/'](context['u10'], context['1'], context['dyH']);
            context['u12'] = Formula['+/'](context['1'], context['u9'], context['u11']);
            context['u13'] = Formula['at2'](context['1'], context['u12']);
            context['u14'] = Formula['+-'](context['u13'], context['21600000'], context['0']);
            context['u15'] = Formula['?:'](context['u13'], context['u13'], context['u14']);
            context['u16'] = Formula['+-'](context['u15'], context['0'], context['enAng']);
            context['u17'] = Formula['+-'](context['u16'], context['21600000'], context['0']);
            context['u18'] = Formula['?:'](context['u16'], context['u16'], context['u17']);
            context['u19'] = Formula['+-'](context['u18'], context['0'], context['cd2']);
            context['u20'] = Formula['+-'](context['u18'], context['0'], context['21600000']);
            context['u21'] = Formula['?:'](context['u19'], context['u20'], context['u18']);
            context['u22'] = Formula['abs'](context['u21']);
            context['minAng'] = Formula['*/'](context['u22'], context['-1'], context['1']);
            context['u23'] = Formula['abs'](context['adj2']);
            context['a2'] = Formula['*/'](context['u23'], context['-1'], context['1']);
            context['aAng'] = Formula['pin'](context['minAng'], context['a2'], context['0']);
            context['ptAng'] = Formula['+-'](context['enAng'], context['aAng'], context['0']);
            context['wtA'] = Formula['sin'](context['rw3'], context['ptAng']);
            context['htA'] = Formula['cos'](context['rh3'], context['ptAng']);
            context['dxA'] = Formula['cat2'](context['rw3'], context['htA'], context['wtA']);
            context['dyA'] = Formula['sat2'](context['rh3'], context['htA'], context['wtA']);
            context['xA'] = Formula['+-'](context['hc'], context['dxA'], context['0']);
            context['yA'] = Formula['+-'](context['vc'], context['dyA'], context['0']);
            context['wtE'] = Formula['sin'](context['rw1'], context['stAng']);
            context['htE'] = Formula['cos'](context['rh1'], context['stAng']);
            context['dxE'] = Formula['cat2'](context['rw1'], context['htE'], context['wtE']);
            context['dyE'] = Formula['sat2'](context['rh1'], context['htE'], context['wtE']);
            context['xE'] = Formula['+-'](context['hc'], context['dxE'], context['0']);
            context['yE'] = Formula['+-'](context['vc'], context['dyE'], context['0']);
            context['wtD'] = Formula['sin'](context['rw2'], context['stAng']);
            context['htD'] = Formula['cos'](context['rh2'], context['stAng']);
            context['dxD'] = Formula['cat2'](context['rw2'], context['htD'], context['wtD']);
            context['dyD'] = Formula['sat2'](context['rh2'], context['htD'], context['wtD']);
            context['xD'] = Formula['+-'](context['hc'], context['dxD'], context['0']);
            context['yD'] = Formula['+-'](context['vc'], context['dyD'], context['0']);
            context['dxG'] = Formula['cos'](context['thh'], context['ptAng']);
            context['dyG'] = Formula['sin'](context['thh'], context['ptAng']);
            context['xG'] = Formula['+-'](context['xH'], context['dxG'], context['0']);
            context['yG'] = Formula['+-'](context['yH'], context['dyG'], context['0']);
            context['dxB'] = Formula['cos'](context['thh'], context['ptAng']);
            context['dyB'] = Formula['sin'](context['thh'], context['ptAng']);
            context['xB'] = Formula['+-'](
                context['xH'],
                context['0'],
                context['dxB'],
                context['0']
            );
            context['yB'] = Formula['+-'](
                context['yH'],
                context['0'],
                context['dyB'],
                context['0']
            );
            context['sx1'] = Formula['+-'](context['xB'], context['0'], context['hc']);
            context['sy1'] = Formula['+-'](context['yB'], context['0'], context['vc']);
            context['sx2'] = Formula['+-'](context['xG'], context['0'], context['hc']);
            context['sy2'] = Formula['+-'](context['yG'], context['0'], context['vc']);
            context['rO'] = Formula['min'](context['rw1'], context['rh1']);
            context['x1O'] = Formula['*/'](context['sx1'], context['rO'], context['rw1']);
            context['y1O'] = Formula['*/'](context['sy1'], context['rO'], context['rh1']);
            context['x2O'] = Formula['*/'](context['sx2'], context['rO'], context['rw1']);
            context['y2O'] = Formula['*/'](context['sy2'], context['rO'], context['rh1']);
            context['dxO'] = Formula['+-'](context['x2O'], context['0'], context['x1O']);
            context['dyO'] = Formula['+-'](context['y2O'], context['0'], context['y1O']);
            context['dO'] = Formula['mod'](context['dxO'], context['dyO'], context['0']);
            context['q1'] = Formula['*/'](context['x1O'], context['y2O'], context['1']);
            context['q2'] = Formula['*/'](context['x2O'], context['y1O'], context['1']);
            context['DO'] = Formula['+-'](context['q1'], context['0'], context['q2']);
            context['q3'] = Formula['*/'](context['rO'], context['rO'], context['1']);
            context['q4'] = Formula['*/'](context['dO'], context['dO'], context['1']);
            context['q5'] = Formula['*/'](context['q3'], context['q4'], context['1']);
            context['q6'] = Formula['*/'](context['DO'], context['DO'], context['1']);
            context['q7'] = Formula['+-'](context['q5'], context['0'], context['q6']);
            context['q8'] = Formula['max'](context['q7'], context['0']);
            context['sdelO'] = Formula['sqrt'](context['q8']);
            context['ndyO'] = Formula['*/'](context['dyO'], context['-1'], context['1']);
            context['sdyO'] = Formula['?:'](context['ndyO'], context['-1'], context['1']);
            context['q9'] = Formula['*/'](context['sdyO'], context['dxO'], context['1']);
            context['q10'] = Formula['*/'](context['q9'], context['sdelO'], context['1']);
            context['q11'] = Formula['*/'](context['DO'], context['dyO'], context['1']);
            context['dxF1'] = Formula['+/'](context['q11'], context['q10'], context['q4']);
            context['q12'] = Formula['+-'](context['q11'], context['0'], context['q10']);
            context['dxF2'] = Formula['*/'](context['q12'], context['1'], context['q4']);
            context['adyO'] = Formula['abs'](context['dyO']);
            context['q13'] = Formula['*/'](context['adyO'], context['sdelO'], context['1']);
            context['q14'] = Formula['*/'](context['DO'], context['dxO'], context['-1']);
            context['dyF1'] = Formula['+/'](context['q14'], context['q13'], context['q4']);
            context['q15'] = Formula['+-'](context['q14'], context['0'], context['q13']);
            context['dyF2'] = Formula['*/'](context['q15'], context['1'], context['q4']);
            context['q16'] = Formula['+-'](context['x2O'], context['0'], context['dxF1']);
            context['q17'] = Formula['+-'](context['x2O'], context['0'], context['dxF2']);
            context['q18'] = Formula['+-'](context['y2O'], context['0'], context['dyF1']);
            context['q19'] = Formula['+-'](context['y2O'], context['0'], context['dyF2']);
            context['q20'] = Formula['mod'](context['q16'], context['q18'], context['0']);
            context['q21'] = Formula['mod'](context['q17'], context['q19'], context['0']);
            context['q22'] = Formula['+-'](context['q21'], context['0'], context['q20']);
            context['dxF'] = Formula['?:'](context['q22'], context['dxF1'], context['dxF2']);
            context['dyF'] = Formula['?:'](context['q22'], context['dyF1'], context['dyF2']);
            context['sdxF'] = Formula['*/'](context['dxF'], context['rw1'], context['rO']);
            context['sdyF'] = Formula['*/'](context['dyF'], context['rh1'], context['rO']);
            context['xF'] = Formula['+-'](context['hc'], context['sdxF'], context['0']);
            context['yF'] = Formula['+-'](context['vc'], context['sdyF'], context['0']);
            context['x1I'] = Formula['*/'](context['sx1'], context['rI'], context['rw2']);
            context['y1I'] = Formula['*/'](context['sy1'], context['rI'], context['rh2']);
            context['x2I'] = Formula['*/'](context['sx2'], context['rI'], context['rw2']);
            context['y2I'] = Formula['*/'](context['sy2'], context['rI'], context['rh2']);
            context['dxI'] = Formula['+-'](context['x2I'], context['0'], context['x1I']);
            context['dyI'] = Formula['+-'](context['y2I'], context['0'], context['y1I']);
            context['dI'] = Formula['mod'](context['dxI'], context['dyI'], context['0']);
            context['v1'] = Formula['*/'](context['x1I'], context['y2I'], context['1']);
            context['v2'] = Formula['*/'](context['x2I'], context['y1I'], context['1']);
            context['DI'] = Formula['+-'](context['v1'], context['0'], context['v2']);
            context['v3'] = Formula['*/'](context['rI'], context['rI'], context['1']);
            context['v4'] = Formula['*/'](context['dI'], context['dI'], context['1']);
            context['v5'] = Formula['*/'](context['v3'], context['v4'], context['1']);
            context['v6'] = Formula['*/'](context['DI'], context['DI'], context['1']);
            context['v7'] = Formula['+-'](context['v5'], context['0'], context['v6']);
            context['v8'] = Formula['max'](context['v7'], context['0']);
            context['sdelI'] = Formula['sqrt'](context['v8']);
            context['v9'] = Formula['*/'](context['sdyO'], context['dxI'], context['1']);
            context['v10'] = Formula['*/'](context['v9'], context['sdelI'], context['1']);
            context['v11'] = Formula['*/'](context['DI'], context['dyI'], context['1']);
            context['dxC1'] = Formula['+/'](context['v11'], context['v10'], context['v4']);
            context['v12'] = Formula['+-'](context['v11'], context['0'], context['v10']);
            context['dxC2'] = Formula['*/'](context['v12'], context['1'], context['v4']);
            context['adyI'] = Formula['abs'](context['dyI']);
            context['v13'] = Formula['*/'](context['adyI'], context['sdelI'], context['1']);
            context['v14'] = Formula['*/'](context['DI'], context['dxI'], context['-1']);
            context['dyC1'] = Formula['+/'](context['v14'], context['v13'], context['v4']);
            context['v15'] = Formula['+-'](context['v14'], context['0'], context['v13']);
            context['dyC2'] = Formula['*/'](context['v15'], context['1'], context['v4']);
            context['v16'] = Formula['+-'](context['x1I'], context['0'], context['dxC1']);
            context['v17'] = Formula['+-'](context['x1I'], context['0'], context['dxC2']);
            context['v18'] = Formula['+-'](context['y1I'], context['0'], context['dyC1']);
            context['v19'] = Formula['+-'](context['y1I'], context['0'], context['dyC2']);
            context['v20'] = Formula['mod'](context['v16'], context['v18'], context['0']);
            context['v21'] = Formula['mod'](context['v17'], context['v19'], context['0']);
            context['v22'] = Formula['+-'](context['v21'], context['0'], context['v20']);
            context['dxC'] = Formula['?:'](context['v22'], context['dxC1'], context['dxC2']);
            context['dyC'] = Formula['?:'](context['v22'], context['dyC1'], context['dyC2']);
            context['sdxC'] = Formula['*/'](context['dxC'], context['rw2'], context['rI']);
            context['sdyC'] = Formula['*/'](context['dyC'], context['rh2'], context['rI']);
            context['xC'] = Formula['+-'](context['hc'], context['sdxC'], context['0']);
            context['yC'] = Formula['+-'](context['vc'], context['sdyC'], context['0']);
            context['ist0'] = Formula['at2'](context['sdxC'], context['sdyC']);
            context['ist1'] = Formula['+-'](context['ist0'], context['21600000'], context['0']);
            context['istAng0'] = Formula['?:'](context['ist0'], context['ist0'], context['ist1']);
            context['isw1'] = Formula['+-'](context['stAng'], context['0'], context['istAng0']);
            context['isw2'] = Formula['+-'](context['isw1'], context['21600000'], context['0']);
            context['iswAng0'] = Formula['?:'](context['isw1'], context['isw1'], context['isw2']);
            context['istAng'] = Formula['+-'](context['istAng0'], context['iswAng0'], context['0']);
            context['iswAng'] = Formula['+-'](context['0'], context['0'], context['iswAng0']);
            context['p1'] = Formula['+-'](context['xF'], context['0'], context['xC']);
            context['p2'] = Formula['+-'](context['yF'], context['0'], context['yC']);
            context['p3'] = Formula['mod'](context['p1'], context['p2'], context['0']);
            context['p4'] = Formula['*/'](context['p3'], context['1'], context['2']);
            context['p5'] = Formula['+-'](context['p4'], context['0'], context['thh']);
            context['xGp'] = Formula['?:'](context['p5'], context['xF'], context['xG']);
            context['yGp'] = Formula['?:'](context['p5'], context['yF'], context['yG']);
            context['xBp'] = Formula['?:'](context['p5'], context['xC'], context['xB']);
            context['yBp'] = Formula['?:'](context['p5'], context['yC'], context['yB']);
            context['en0'] = Formula['at2'](context['sdxF'], context['sdyF']);
            context['en1'] = Formula['+-'](context['en0'], context['21600000'], context['0']);
            context['en2'] = Formula['?:'](context['en0'], context['en0'], context['en1']);
            context['sw0'] = Formula['+-'](context['en2'], context['0'], context['stAng']);
            context['sw1'] = Formula['+-'](context['sw0'], context['0'], context['21600000']);
            context['swAng'] = Formula['?:'](context['sw0'], context['sw1'], context['sw0']);
            context['stAng0'] = Formula['+-'](context['stAng'], context['swAng'], context['0']);
            context['swAng0'] = Formula['+-'](context['0'], context['0'], context['swAng']);
            context['wtI'] = Formula['sin'](context['rw3'], context['stAng']);
            context['htI'] = Formula['cos'](context['rh3'], context['stAng']);
            context['dxI'] = Formula['cat2'](context['rw3'], context['htI'], context['wtI']);
            context['dyI'] = Formula['sat2'](context['rh3'], context['htI'], context['wtI']);
            context['xI'] = Formula['+-'](context['hc'], context['dxI'], context['0']);
            context['yI'] = Formula['+-'](context['vc'], context['dyI'], context['0']);
            context['aI'] = Formula['+-'](context['stAng'], context['cd4'], context['0']);
            context['aA'] = Formula['+-'](context['ptAng'], context['0'], context['cd4']);
            context['aB'] = Formula['+-'](context['ptAng'], context['cd2'], context['0']);
            context['idx'] = Formula['cos'](context['rw1'], context['2700000']);
            context['idy'] = Formula['sin'](context['rh1'], context['2700000']);
            context['il'] = Formula['+-'](context['hc'], context['0'], context['idx']);
            context['ir'] = Formula['+-'](context['hc'], context['idx'], context['0']);
            context['it'] = Formula['+-'](context['vc'], context['0'], context['idy']);
            context['ib'] = Formula['+-'](context['vc'], context['idy'], context['0']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['xE'], context['yE'])} ${lineTo(
                            context,
                            context['xD'],
                            context['yD']
                        )} ${arcTo(
                            context,
                            context['rw2'],
                            context['rh2'],
                            context['istAng'],
                            context['iswAng']
                        )} ${lineTo(context, context['xBp'], context['yBp'])} ${lineTo(
                            context,
                            context['xA'],
                            context['yA']
                        )} ${lineTo(context, context['xGp'], context['yGp'])} ${lineTo(
                            context,
                            context['xF'],
                            context['yF']
                        )} ${arcTo(
                            context,
                            context['rw1'],
                            context['rh1'],
                            context['stAng0'],
                            context['swAng0']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.LEFT_RIGHT_ARROW]: {
        editable: true,
        defaultValue: [50000, 50000],
        defaultKey: ['adj1', 'adj2'],
        formula: (width: number, height: number, [adj1, adj2]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;

            context['maxAdj2'] = Formula['*/'](context['50000'], context['w'], context['ss']);
            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['100000']);
            context['a2'] = Formula['pin'](context['0'], context['adj2'], context['maxAdj2']);
            context['x2'] = Formula['*/'](context['ss'], context['a2'], context['100000']);
            context['x3'] = Formula['+-'](context['r'], context['0'], context['x2']);
            context['dy'] = Formula['*/'](context['h'], context['a1'], context['200000']);
            context['y1'] = Formula['+-'](context['vc'], context['0'], context['dy']);
            context['y2'] = Formula['+-'](context['vc'], context['dy'], context['0']);
            context['dx1'] = Formula['*/'](context['y1'], context['x2'], context['hd2']);
            context['x1'] = Formula['+-'](context['x2'], context['0'], context['dx1']);
            context['x4'] = Formula['+-'](context['x3'], context['dx1'], context['0']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['vc'])} ${lineTo(
                            context,
                            context['x2'],
                            context['t']
                        )} ${lineTo(context, context['x2'], context['y1'])} ${lineTo(
                            context,
                            context['x3'],
                            context['y1']
                        )} ${lineTo(context, context['x3'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['vc']
                        )} ${lineTo(context, context['x3'], context['b'])} ${lineTo(
                            context,
                            context['x3'],
                            context['y2']
                        )} ${lineTo(context, context['x2'], context['y2'])} ${lineTo(
                            context,
                            context['x2'],
                            context['b']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.LEFT_RIGHT_ARROW_CALLOUT]: {
        editable: true,
        defaultValue: [25000, 25000, 25000, 48123],
        defaultKey: ['adj1', 'adj2', 'adj3', 'adj4'],
        formula: (width: number, height: number, [adj1, adj2, adj3, adj4]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;
            context['adj3'] = adj3;
            context['adj4'] = adj4;

            context['maxAdj2'] = Formula['*/'](context['50000'], context['h'], context['ss']);
            context['a2'] = Formula['pin'](context['0'], context['adj2'], context['maxAdj2']);
            context['maxAdj1'] = Formula['*/'](context['a2'], context['2'], context['1']);
            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['maxAdj1']);
            context['maxAdj3'] = Formula['*/'](context['50000'], context['w'], context['ss']);
            context['a3'] = Formula['pin'](context['0'], context['adj3'], context['maxAdj3']);
            context['q2'] = Formula['*/'](context['a3'], context['ss'], context['wd2']);
            context['maxAdj4'] = Formula['+-'](context['100000'], context['0'], context['q2']);
            context['a4'] = Formula['pin'](context['0'], context['adj4'], context['maxAdj4']);
            context['dy1'] = Formula['*/'](context['ss'], context['a2'], context['100000']);
            context['dy2'] = Formula['*/'](context['ss'], context['a1'], context['200000']);
            context['y1'] = Formula['+-'](context['vc'], context['0'], context['dy1']);
            context['y2'] = Formula['+-'](context['vc'], context['0'], context['dy2']);
            context['y3'] = Formula['+-'](context['vc'], context['dy2'], context['0']);
            context['y4'] = Formula['+-'](context['vc'], context['dy1'], context['0']);
            context['x1'] = Formula['*/'](context['ss'], context['a3'], context['100000']);
            context['x4'] = Formula['+-'](context['r'], context['0'], context['x1']);
            context['dx2'] = Formula['*/'](context['w'], context['a4'], context['200000']);
            context['x2'] = Formula['+-'](context['hc'], context['0'], context['dx2']);
            context['x3'] = Formula['+-'](context['hc'], context['dx2'], context['0']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['vc'])} ${lineTo(
                            context,
                            context['x1'],
                            context['y1']
                        )} ${lineTo(context, context['x1'], context['y2'])} ${lineTo(
                            context,
                            context['x2'],
                            context['y2']
                        )} ${lineTo(context, context['x2'], context['t'])} ${lineTo(
                            context,
                            context['x3'],
                            context['t']
                        )} ${lineTo(context, context['x3'], context['y2'])} ${lineTo(
                            context,
                            context['x4'],
                            context['y2']
                        )} ${lineTo(context, context['x4'], context['y1'])} ${lineTo(
                            context,
                            context['r'],
                            context['vc']
                        )} ${lineTo(context, context['x4'], context['y4'])} ${lineTo(
                            context,
                            context['x4'],
                            context['y3']
                        )} ${lineTo(context, context['x3'], context['y3'])} ${lineTo(
                            context,
                            context['x3'],
                            context['b']
                        )} ${lineTo(context, context['x2'], context['b'])} ${lineTo(
                            context,
                            context['x2'],
                            context['y3']
                        )} ${lineTo(context, context['x1'], context['y3'])} ${lineTo(
                            context,
                            context['x1'],
                            context['y4']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.LEFT_RIGHT_CIRCULAR_ARROW]: {
        editable: true,
        defaultValue: [12500, 1142319, 20457681, 11942319, 12500],
        defaultKey: ['adj1', 'adj2', 'adj3', 'adj4', 'adj5'],
        formula: (width: number, height: number, [adj1, adj2, adj3, adj4, adj5]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;
            context['adj3'] = adj3;
            context['adj4'] = adj4;
            context['adj5'] = adj5;

            context['a5'] = Formula['pin'](context['0'], context['adj5'], context['25000']);
            context['maxAdj1'] = Formula['*/'](context['a5'], context['2'], context['1']);
            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['maxAdj1']);
            context['enAng'] = Formula['pin'](context['1'], context['adj3'], context['21599999']);
            context['stAng'] = Formula['pin'](context['0'], context['adj4'], context['21599999']);
            context['th'] = Formula['*/'](context['ss'], context['a1'], context['100000']);
            context['thh'] = Formula['*/'](context['ss'], context['a5'], context['100000']);
            context['th2'] = Formula['*/'](context['th'], context['1'], context['2']);
            context['rw1'] = Formula['+-'](context['wd2'], context['th2'], context['thh']);
            context['rh1'] = Formula['+-'](context['hd2'], context['th2'], context['thh']);
            context['rw2'] = Formula['+-'](context['rw1'], context['0'], context['th']);
            context['rh2'] = Formula['+-'](context['rh1'], context['0'], context['th']);
            context['rw3'] = Formula['+-'](context['rw2'], context['th2'], context['0']);
            context['rh3'] = Formula['+-'](context['rh2'], context['th2'], context['0']);
            context['wtH'] = Formula['sin'](context['rw3'], context['enAng']);
            context['htH'] = Formula['cos'](context['rh3'], context['enAng']);
            context['dxH'] = Formula['cat2'](context['rw3'], context['htH'], context['wtH']);
            context['dyH'] = Formula['sat2'](context['rh3'], context['htH'], context['wtH']);
            context['xH'] = Formula['+-'](context['hc'], context['dxH'], context['0']);
            context['yH'] = Formula['+-'](context['vc'], context['dyH'], context['0']);
            context['rI'] = Formula['min'](context['rw2'], context['rh2']);
            context['u1'] = Formula['*/'](context['dxH'], context['dxH'], context['1']);
            context['u2'] = Formula['*/'](context['dyH'], context['dyH'], context['1']);
            context['u3'] = Formula['*/'](context['rI'], context['rI'], context['1']);
            context['u4'] = Formula['+-'](context['u1'], context['0'], context['u3']);
            context['u5'] = Formula['+-'](context['u2'], context['0'], context['u3']);
            context['u6'] = Formula['*/'](context['u4'], context['u5'], context['u1']);
            context['u7'] = Formula['*/'](context['u6'], context['1'], context['u2']);
            context['u8'] = Formula['+-'](context['1'], context['0'], context['u7']);
            context['u9'] = Formula['sqrt'](context['u8']);
            context['u10'] = Formula['*/'](context['u4'], context['1'], context['dxH']);
            context['u11'] = Formula['*/'](context['u10'], context['1'], context['dyH']);
            context['u12'] = Formula['+/'](context['1'], context['u9'], context['u11']);
            context['u13'] = Formula['at2'](context['1'], context['u12']);
            context['u14'] = Formula['+-'](context['u13'], context['21600000'], context['0']);
            context['u15'] = Formula['?:'](context['u13'], context['u13'], context['u14']);
            context['u16'] = Formula['+-'](context['u15'], context['0'], context['enAng']);
            context['u17'] = Formula['+-'](context['u16'], context['21600000'], context['0']);
            context['u18'] = Formula['?:'](context['u16'], context['u16'], context['u17']);
            context['u19'] = Formula['+-'](context['u18'], context['0'], context['cd2']);
            context['u20'] = Formula['+-'](context['u18'], context['0'], context['21600000']);
            context['u21'] = Formula['?:'](context['u19'], context['u20'], context['u18']);
            context['maxAng'] = Formula['abs'](context['u21']);
            context['aAng'] = Formula['pin'](context['0'], context['adj2'], context['maxAng']);
            context['ptAng'] = Formula['+-'](context['enAng'], context['aAng'], context['0']);
            context['wtA'] = Formula['sin'](context['rw3'], context['ptAng']);
            context['htA'] = Formula['cos'](context['rh3'], context['ptAng']);
            context['dxA'] = Formula['cat2'](context['rw3'], context['htA'], context['wtA']);
            context['dyA'] = Formula['sat2'](context['rh3'], context['htA'], context['wtA']);
            context['xA'] = Formula['+-'](context['hc'], context['dxA'], context['0']);
            context['yA'] = Formula['+-'](context['vc'], context['dyA'], context['0']);
            context['dxG'] = Formula['cos'](context['thh'], context['ptAng']);
            context['dyG'] = Formula['sin'](context['thh'], context['ptAng']);
            context['xG'] = Formula['+-'](context['xH'], context['dxG'], context['0']);
            context['yG'] = Formula['+-'](context['yH'], context['dyG'], context['0']);
            context['dxB'] = Formula['cos'](context['thh'], context['ptAng']);
            context['dyB'] = Formula['sin'](context['thh'], context['ptAng']);
            context['xB'] = Formula['+-'](
                context['xH'],
                context['0'],
                context['dxB'],
                context['0']
            );
            context['yB'] = Formula['+-'](
                context['yH'],
                context['0'],
                context['dyB'],
                context['0']
            );
            context['sx1'] = Formula['+-'](context['xB'], context['0'], context['hc']);
            context['sy1'] = Formula['+-'](context['yB'], context['0'], context['vc']);
            context['sx2'] = Formula['+-'](context['xG'], context['0'], context['hc']);
            context['sy2'] = Formula['+-'](context['yG'], context['0'], context['vc']);
            context['rO'] = Formula['min'](context['rw1'], context['rh1']);
            context['x1O'] = Formula['*/'](context['sx1'], context['rO'], context['rw1']);
            context['y1O'] = Formula['*/'](context['sy1'], context['rO'], context['rh1']);
            context['x2O'] = Formula['*/'](context['sx2'], context['rO'], context['rw1']);
            context['y2O'] = Formula['*/'](context['sy2'], context['rO'], context['rh1']);
            context['dxO'] = Formula['+-'](context['x2O'], context['0'], context['x1O']);
            context['dyO'] = Formula['+-'](context['y2O'], context['0'], context['y1O']);
            context['dO'] = Formula['mod'](context['dxO'], context['dyO'], context['0']);
            context['q1'] = Formula['*/'](context['x1O'], context['y2O'], context['1']);
            context['q2'] = Formula['*/'](context['x2O'], context['y1O'], context['1']);
            context['DO'] = Formula['+-'](context['q1'], context['0'], context['q2']);
            context['q3'] = Formula['*/'](context['rO'], context['rO'], context['1']);
            context['q4'] = Formula['*/'](context['dO'], context['dO'], context['1']);
            context['q5'] = Formula['*/'](context['q3'], context['q4'], context['1']);
            context['q6'] = Formula['*/'](context['DO'], context['DO'], context['1']);
            context['q7'] = Formula['+-'](context['q5'], context['0'], context['q6']);
            context['q8'] = Formula['max'](context['q7'], context['0']);
            context['sdelO'] = Formula['sqrt'](context['q8']);
            context['ndyO'] = Formula['*/'](context['dyO'], context['-1'], context['1']);
            context['sdyO'] = Formula['?:'](context['ndyO'], context['-1'], context['1']);
            context['q9'] = Formula['*/'](context['sdyO'], context['dxO'], context['1']);
            context['q10'] = Formula['*/'](context['q9'], context['sdelO'], context['1']);
            context['q11'] = Formula['*/'](context['DO'], context['dyO'], context['1']);
            context['dxF1'] = Formula['+/'](context['q11'], context['q10'], context['q4']);
            context['q12'] = Formula['+-'](context['q11'], context['0'], context['q10']);
            context['dxF2'] = Formula['*/'](context['q12'], context['1'], context['q4']);
            context['adyO'] = Formula['abs'](context['dyO']);
            context['q13'] = Formula['*/'](context['adyO'], context['sdelO'], context['1']);
            context['q14'] = Formula['*/'](context['DO'], context['dxO'], context['-1']);
            context['dyF1'] = Formula['+/'](context['q14'], context['q13'], context['q4']);
            context['q15'] = Formula['+-'](context['q14'], context['0'], context['q13']);
            context['dyF2'] = Formula['*/'](context['q15'], context['1'], context['q4']);
            context['q16'] = Formula['+-'](context['x2O'], context['0'], context['dxF1']);
            context['q17'] = Formula['+-'](context['x2O'], context['0'], context['dxF2']);
            context['q18'] = Formula['+-'](context['y2O'], context['0'], context['dyF1']);
            context['q19'] = Formula['+-'](context['y2O'], context['0'], context['dyF2']);
            context['q20'] = Formula['mod'](context['q16'], context['q18'], context['0']);
            context['q21'] = Formula['mod'](context['q17'], context['q19'], context['0']);
            context['q22'] = Formula['+-'](context['q21'], context['0'], context['q20']);
            context['dxF'] = Formula['?:'](context['q22'], context['dxF1'], context['dxF2']);
            context['dyF'] = Formula['?:'](context['q22'], context['dyF1'], context['dyF2']);
            context['sdxF'] = Formula['*/'](context['dxF'], context['rw1'], context['rO']);
            context['sdyF'] = Formula['*/'](context['dyF'], context['rh1'], context['rO']);
            context['xF'] = Formula['+-'](context['hc'], context['sdxF'], context['0']);
            context['yF'] = Formula['+-'](context['vc'], context['sdyF'], context['0']);
            context['x1I'] = Formula['*/'](context['sx1'], context['rI'], context['rw2']);
            context['y1I'] = Formula['*/'](context['sy1'], context['rI'], context['rh2']);
            context['x2I'] = Formula['*/'](context['sx2'], context['rI'], context['rw2']);
            context['y2I'] = Formula['*/'](context['sy2'], context['rI'], context['rh2']);
            context['dxI'] = Formula['+-'](context['x2I'], context['0'], context['x1I']);
            context['dyI'] = Formula['+-'](context['y2I'], context['0'], context['y1I']);
            context['dI'] = Formula['mod'](context['dxI'], context['dyI'], context['0']);
            context['v1'] = Formula['*/'](context['x1I'], context['y2I'], context['1']);
            context['v2'] = Formula['*/'](context['x2I'], context['y1I'], context['1']);
            context['DI'] = Formula['+-'](context['v1'], context['0'], context['v2']);
            context['v3'] = Formula['*/'](context['rI'], context['rI'], context['1']);
            context['v4'] = Formula['*/'](context['dI'], context['dI'], context['1']);
            context['v5'] = Formula['*/'](context['v3'], context['v4'], context['1']);
            context['v6'] = Formula['*/'](context['DI'], context['DI'], context['1']);
            context['v7'] = Formula['+-'](context['v5'], context['0'], context['v6']);
            context['v8'] = Formula['max'](context['v7'], context['0']);
            context['sdelI'] = Formula['sqrt'](context['v8']);
            context['v9'] = Formula['*/'](context['sdyO'], context['dxI'], context['1']);
            context['v10'] = Formula['*/'](context['v9'], context['sdelI'], context['1']);
            context['v11'] = Formula['*/'](context['DI'], context['dyI'], context['1']);
            context['dxC1'] = Formula['+/'](context['v11'], context['v10'], context['v4']);
            context['v12'] = Formula['+-'](context['v11'], context['0'], context['v10']);
            context['dxC2'] = Formula['*/'](context['v12'], context['1'], context['v4']);
            context['adyI'] = Formula['abs'](context['dyI']);
            context['v13'] = Formula['*/'](context['adyI'], context['sdelI'], context['1']);
            context['v14'] = Formula['*/'](context['DI'], context['dxI'], context['-1']);
            context['dyC1'] = Formula['+/'](context['v14'], context['v13'], context['v4']);
            context['v15'] = Formula['+-'](context['v14'], context['0'], context['v13']);
            context['dyC2'] = Formula['*/'](context['v15'], context['1'], context['v4']);
            context['v16'] = Formula['+-'](context['x1I'], context['0'], context['dxC1']);
            context['v17'] = Formula['+-'](context['x1I'], context['0'], context['dxC2']);
            context['v18'] = Formula['+-'](context['y1I'], context['0'], context['dyC1']);
            context['v19'] = Formula['+-'](context['y1I'], context['0'], context['dyC2']);
            context['v20'] = Formula['mod'](context['v16'], context['v18'], context['0']);
            context['v21'] = Formula['mod'](context['v17'], context['v19'], context['0']);
            context['v22'] = Formula['+-'](context['v21'], context['0'], context['v20']);
            context['dxC'] = Formula['?:'](context['v22'], context['dxC1'], context['dxC2']);
            context['dyC'] = Formula['?:'](context['v22'], context['dyC1'], context['dyC2']);
            context['sdxC'] = Formula['*/'](context['dxC'], context['rw2'], context['rI']);
            context['sdyC'] = Formula['*/'](context['dyC'], context['rh2'], context['rI']);
            context['xC'] = Formula['+-'](context['hc'], context['sdxC'], context['0']);
            context['yC'] = Formula['+-'](context['vc'], context['sdyC'], context['0']);
            context['wtI'] = Formula['sin'](context['rw3'], context['stAng']);
            context['htI'] = Formula['cos'](context['rh3'], context['stAng']);
            context['dxI'] = Formula['cat2'](context['rw3'], context['htI'], context['wtI']);
            context['dyI'] = Formula['sat2'](context['rh3'], context['htI'], context['wtI']);
            context['xI'] = Formula['+-'](context['hc'], context['dxI'], context['0']);
            context['yI'] = Formula['+-'](context['vc'], context['dyI'], context['0']);
            context['lptAng'] = Formula['+-'](context['stAng'], context['0'], context['aAng']);
            context['wtL'] = Formula['sin'](context['rw3'], context['lptAng']);
            context['htL'] = Formula['cos'](context['rh3'], context['lptAng']);
            context['dxL'] = Formula['cat2'](context['rw3'], context['htL'], context['wtL']);
            context['dyL'] = Formula['sat2'](context['rh3'], context['htL'], context['wtL']);
            context['xL'] = Formula['+-'](context['hc'], context['dxL'], context['0']);
            context['yL'] = Formula['+-'](context['vc'], context['dyL'], context['0']);
            context['dxK'] = Formula['cos'](context['thh'], context['lptAng']);
            context['dyK'] = Formula['sin'](context['thh'], context['lptAng']);
            context['xK'] = Formula['+-'](context['xI'], context['dxK'], context['0']);
            context['yK'] = Formula['+-'](context['yI'], context['dyK'], context['0']);
            context['dxJ'] = Formula['cos'](context['thh'], context['lptAng']);
            context['dyJ'] = Formula['sin'](context['thh'], context['lptAng']);
            context['xJ'] = Formula['+-'](
                context['xI'],
                context['0'],
                context['dxJ'],
                context['0']
            );
            context['yJ'] = Formula['+-'](
                context['yI'],
                context['0'],
                context['dyJ'],
                context['0']
            );
            context['p1'] = Formula['+-'](context['xF'], context['0'], context['xC']);
            context['p2'] = Formula['+-'](context['yF'], context['0'], context['yC']);
            context['p3'] = Formula['mod'](context['p1'], context['p2'], context['0']);
            context['p4'] = Formula['*/'](context['p3'], context['1'], context['2']);
            context['p5'] = Formula['+-'](context['p4'], context['0'], context['thh']);
            context['xGp'] = Formula['?:'](context['p5'], context['xF'], context['xG']);
            context['yGp'] = Formula['?:'](context['p5'], context['yF'], context['yG']);
            context['xBp'] = Formula['?:'](context['p5'], context['xC'], context['xB']);
            context['yBp'] = Formula['?:'](context['p5'], context['yC'], context['yB']);
            context['en0'] = Formula['at2'](context['sdxF'], context['sdyF']);
            context['en1'] = Formula['+-'](context['en0'], context['21600000'], context['0']);
            context['en2'] = Formula['?:'](context['en0'], context['en0'], context['en1']);
            context['od0'] = Formula['+-'](context['en2'], context['0'], context['enAng']);
            context['od1'] = Formula['+-'](context['od0'], context['21600000'], context['0']);
            context['od2'] = Formula['?:'](context['od0'], context['od0'], context['od1']);
            context['st0'] = Formula['+-'](context['stAng'], context['0'], context['od2']);
            context['st1'] = Formula['+-'](context['st0'], context['21600000'], context['0']);
            context['st2'] = Formula['?:'](context['st0'], context['st0'], context['st1']);
            context['sw0'] = Formula['+-'](context['en2'], context['0'], context['st2']);
            context['sw1'] = Formula['+-'](context['sw0'], context['21600000'], context['0']);
            context['swAng'] = Formula['?:'](context['sw0'], context['sw0'], context['sw1']);
            context['ist0'] = Formula['at2'](context['sdxC'], context['sdyC']);
            context['ist1'] = Formula['+-'](context['ist0'], context['21600000'], context['0']);
            context['istAng'] = Formula['?:'](context['ist0'], context['ist0'], context['ist1']);
            context['id0'] = Formula['+-'](context['istAng'], context['0'], context['enAng']);
            context['id1'] = Formula['+-'](context['id0'], context['0'], context['21600000']);
            context['id2'] = Formula['?:'](context['id0'], context['id1'], context['id0']);
            context['ien0'] = Formula['+-'](context['stAng'], context['0'], context['id2']);
            context['ien1'] = Formula['+-'](context['ien0'], context['0'], context['21600000']);
            context['ien2'] = Formula['?:'](context['ien1'], context['ien1'], context['ien0']);
            context['isw1'] = Formula['+-'](context['ien2'], context['0'], context['istAng']);
            context['isw2'] = Formula['+-'](context['isw1'], context['0'], context['21600000']);
            context['iswAng'] = Formula['?:'](context['isw1'], context['isw2'], context['isw1']);
            context['wtE'] = Formula['sin'](context['rw1'], context['st2']);
            context['htE'] = Formula['cos'](context['rh1'], context['st2']);
            context['dxE'] = Formula['cat2'](context['rw1'], context['htE'], context['wtE']);
            context['dyE'] = Formula['sat2'](context['rh1'], context['htE'], context['wtE']);
            context['xE'] = Formula['+-'](context['hc'], context['dxE'], context['0']);
            context['yE'] = Formula['+-'](context['vc'], context['dyE'], context['0']);
            context['wtD'] = Formula['sin'](context['rw2'], context['ien2']);
            context['htD'] = Formula['cos'](context['rh2'], context['ien2']);
            context['dxD'] = Formula['cat2'](context['rw2'], context['htD'], context['wtD']);
            context['dyD'] = Formula['sat2'](context['rh2'], context['htD'], context['wtD']);
            context['xD'] = Formula['+-'](context['hc'], context['dxD'], context['0']);
            context['yD'] = Formula['+-'](context['vc'], context['dyD'], context['0']);
            context['xKp'] = Formula['?:'](context['p5'], context['xE'], context['xK']);
            context['yKp'] = Formula['?:'](context['p5'], context['yE'], context['yK']);
            context['xJp'] = Formula['?:'](context['p5'], context['xD'], context['xJ']);
            context['yJp'] = Formula['?:'](context['p5'], context['yD'], context['yJ']);
            context['aL'] = Formula['+-'](context['lptAng'], context['0'], context['cd4']);
            context['aA'] = Formula['+-'](context['ptAng'], context['cd4'], context['0']);
            context['aB'] = Formula['+-'](context['ptAng'], context['cd2'], context['0']);
            context['aJ'] = Formula['+-'](context['lptAng'], context['cd2'], context['0']);
            context['idx'] = Formula['cos'](context['rw1'], context['2700000']);
            context['idy'] = Formula['sin'](context['rh1'], context['2700000']);
            context['il'] = Formula['+-'](context['hc'], context['0'], context['idx']);
            context['ir'] = Formula['+-'](context['hc'], context['idx'], context['0']);
            context['it'] = Formula['+-'](context['vc'], context['0'], context['idy']);
            context['ib'] = Formula['+-'](context['vc'], context['idy'], context['0']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['xL'], context['yL'])} ${lineTo(
                            context,
                            context['xKp'],
                            context['yKp']
                        )} ${lineTo(context, context['xE'], context['yE'])} ${arcTo(
                            context,
                            context['rw1'],
                            context['rh1'],
                            context['st2'],
                            context['swAng']
                        )} ${lineTo(context, context['xGp'], context['yGp'])} ${lineTo(
                            context,
                            context['xA'],
                            context['yA']
                        )} ${lineTo(context, context['xBp'], context['yBp'])} ${lineTo(
                            context,
                            context['xC'],
                            context['yC']
                        )} ${arcTo(
                            context,
                            context['rw2'],
                            context['rh2'],
                            context['istAng'],
                            context['iswAng']
                        )} ${lineTo(context, context['xJp'], context['yJp'])} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.LEFT_RIGHT_RIBBON]: {
        editable: true,
        defaultValue: [50000, 50000, 16667],
        defaultKey: ['adj1', 'adj2', 'adj3'],
        formula: (width: number, height: number, [adj1, adj2, adj3]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;
            context['adj3'] = adj3;

            context['a3'] = Formula['pin'](context['0'], context['adj3'], context['33333']);
            context['maxAdj1'] = Formula['+-'](context['100000'], context['0'], context['a3']);
            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['maxAdj1']);
            context['w1'] = Formula['+-'](context['wd2'], context['0'], context['wd32']);
            context['maxAdj2'] = Formula['*/'](context['100000'], context['w1'], context['ss']);
            context['a2'] = Formula['pin'](context['0'], context['adj2'], context['maxAdj2']);
            context['x1'] = Formula['*/'](context['ss'], context['a2'], context['100000']);
            context['x4'] = Formula['+-'](context['r'], context['0'], context['x1']);
            context['dy1'] = Formula['*/'](context['h'], context['a1'], context['200000']);
            context['dy2'] = Formula['*/'](context['h'], context['a3'], context['-200000']);
            context['ly1'] = Formula['+-'](context['vc'], context['dy2'], context['dy1']);
            context['ry4'] = Formula['+-'](context['vc'], context['dy1'], context['dy2']);
            context['ly2'] = Formula['+-'](context['ly1'], context['dy1'], context['0']);
            context['ry3'] = Formula['+-'](context['b'], context['0'], context['ly2']);
            context['ly4'] = Formula['*/'](context['ly2'], context['2'], context['1']);
            context['ry1'] = Formula['+-'](context['b'], context['0'], context['ly4']);
            context['ly3'] = Formula['+-'](context['ly4'], context['0'], context['ly1']);
            context['ry2'] = Formula['+-'](context['b'], context['0'], context['ly3']);
            context['hR'] = Formula['*/'](context['a3'], context['ss'], context['400000']);
            context['x2'] = Formula['+-'](context['hc'], context['0'], context['wd32']);
            context['x3'] = Formula['+-'](context['hc'], context['wd32'], context['0']);
            context['y1'] = Formula['+-'](context['ly1'], context['hR'], context['0']);
            context['y2'] = Formula['+-'](context['ry2'], context['0'], context['hR']);

            return [
                {
                    d: path(context, { stroke: 'false', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['l'], context['ly2'])} ${lineTo(
                            context,
                            context['x1'],
                            context['t']
                        )} ${lineTo(context, context['x1'], context['ly1'])} ${lineTo(
                            context,
                            context['hc'],
                            context['ly1']
                        )} ${arcTo(
                            context,
                            context['wd32'],
                            context['hR'],
                            context['3cd4'],
                            context['cd2']
                        )} ${arcTo(
                            context,
                            context['wd32'],
                            context['hR'],
                            context['3cd4'],
                            context['-10800000']
                        )} ${lineTo(context, context['x4'], context['ry2'])} ${lineTo(
                            context,
                            context['x4'],
                            context['ry1']
                        )} ${lineTo(context, context['r'], context['ry3'])} ${lineTo(
                            context,
                            context['x4'],
                            context['b']
                        )} ${lineTo(context, context['x4'], context['ry4'])} ${lineTo(
                            context,
                            context['hc'],
                            context['ry4']
                        )} ${arcTo(
                            context,
                            context['wd32'],
                            context['hR'],
                            context['cd4'],
                            context['cd4']
                        )} ${lineTo(context, context['x2'], context['ly3'])} ${lineTo(
                            context,
                            context['x1'],
                            context['ly3']
                        )} ${lineTo(context, context['x1'], context['ly4'])} ${close(context)}`;
                    }),
                    attrs: { stroke: 'false', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(
                        context,
                        { stroke: 'false', fill: 'darkenLess', extrusionOk: 'false' },
                        () => {
                            return `${moveTo(context, context['x3'], context['y1'])} ${arcTo(
                                context,
                                context['wd32'],
                                context['hR'],
                                context['0'],
                                context['cd4']
                            )} ${arcTo(
                                context,
                                context['wd32'],
                                context['hR'],
                                context['3cd4'],
                                context['-10800000']
                            )} ${lineTo(context, context['x3'], context['ry2'])} ${close(context)}`;
                        }
                    ),
                    attrs: { stroke: 'false', fill: 'darkenLess', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['l'], context['ly2'])} ${lineTo(
                            context,
                            context['x1'],
                            context['t']
                        )} ${lineTo(context, context['x1'], context['ly1'])} ${lineTo(
                            context,
                            context['hc'],
                            context['ly1']
                        )} ${arcTo(
                            context,
                            context['wd32'],
                            context['hR'],
                            context['3cd4'],
                            context['cd2']
                        )} ${arcTo(
                            context,
                            context['wd32'],
                            context['hR'],
                            context['3cd4'],
                            context['-10800000']
                        )} ${lineTo(context, context['x4'], context['ry2'])} ${lineTo(
                            context,
                            context['x4'],
                            context['ry1']
                        )} ${lineTo(context, context['r'], context['ry3'])} ${lineTo(
                            context,
                            context['x4'],
                            context['b']
                        )} ${lineTo(context, context['x4'], context['ry4'])} ${lineTo(
                            context,
                            context['hc'],
                            context['ry4']
                        )} ${arcTo(
                            context,
                            context['wd32'],
                            context['hR'],
                            context['cd4'],
                            context['cd4']
                        )} ${lineTo(context, context['x2'], context['ly3'])} ${lineTo(
                            context,
                            context['x1'],
                            context['ly3']
                        )} ${lineTo(context, context['x1'], context['ly4'])} ${close(
                            context
                        )} ${moveTo(context, context['x3'], context['y1'])} ${lineTo(
                            context,
                            context['x3'],
                            context['ry2']
                        )} ${moveTo(context, context['x2'], context['y2'])} ${lineTo(
                            context,
                            context['x2'],
                            context['ly3']
                        )}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.LEFT_RIGHT_UP_ARROW]: {
        editable: true,
        defaultValue: [25000, 25000, 25000],
        defaultKey: ['adj1', 'adj2', 'adj3'],
        formula: (width: number, height: number, [adj1, adj2, adj3]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;
            context['adj3'] = adj3;

            context['a2'] = Formula['pin'](context['0'], context['adj2'], context['50000']);
            context['maxAdj1'] = Formula['*/'](context['a2'], context['2'], context['1']);
            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['maxAdj1']);
            context['q1'] = Formula['+-'](context['100000'], context['0'], context['maxAdj1']);
            context['maxAdj3'] = Formula['*/'](context['q1'], context['1'], context['2']);
            context['a3'] = Formula['pin'](context['0'], context['adj3'], context['maxAdj3']);
            context['x1'] = Formula['*/'](context['ss'], context['a3'], context['100000']);
            context['dx2'] = Formula['*/'](context['ss'], context['a2'], context['100000']);
            context['x2'] = Formula['+-'](context['hc'], context['0'], context['dx2']);
            context['x5'] = Formula['+-'](context['hc'], context['dx2'], context['0']);
            context['dx3'] = Formula['*/'](context['ss'], context['a1'], context['200000']);
            context['x3'] = Formula['+-'](context['hc'], context['0'], context['dx3']);
            context['x4'] = Formula['+-'](context['hc'], context['dx3'], context['0']);
            context['x6'] = Formula['+-'](context['r'], context['0'], context['x1']);
            context['dy2'] = Formula['*/'](context['ss'], context['a2'], context['50000']);
            context['y2'] = Formula['+-'](context['b'], context['0'], context['dy2']);
            context['y4'] = Formula['+-'](context['b'], context['0'], context['dx2']);
            context['y3'] = Formula['+-'](context['y4'], context['0'], context['dx3']);
            context['y5'] = Formula['+-'](context['y4'], context['dx3'], context['0']);
            context['il'] = Formula['*/'](context['dx3'], context['x1'], context['dx2']);
            context['ir'] = Formula['+-'](context['r'], context['0'], context['il']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['y4'])} ${lineTo(
                            context,
                            context['x1'],
                            context['y2']
                        )} ${lineTo(context, context['x1'], context['y3'])} ${lineTo(
                            context,
                            context['x3'],
                            context['y3']
                        )} ${lineTo(context, context['x3'], context['x1'])} ${lineTo(
                            context,
                            context['x2'],
                            context['x1']
                        )} ${lineTo(context, context['hc'], context['t'])} ${lineTo(
                            context,
                            context['x5'],
                            context['x1']
                        )} ${lineTo(context, context['x4'], context['x1'])} ${lineTo(
                            context,
                            context['x4'],
                            context['y3']
                        )} ${lineTo(context, context['x6'], context['y3'])} ${lineTo(
                            context,
                            context['x6'],
                            context['y2']
                        )} ${lineTo(context, context['r'], context['y4'])} ${lineTo(
                            context,
                            context['x6'],
                            context['b']
                        )} ${lineTo(context, context['x6'], context['y5'])} ${lineTo(
                            context,
                            context['x1'],
                            context['y5']
                        )} ${lineTo(context, context['x1'], context['b'])} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.LEFT_UP_ARROW]: {
        editable: true,
        defaultValue: [25000, 25000, 25000],
        defaultKey: ['adj1', 'adj2', 'adj3'],
        formula: (width: number, height: number, [adj1, adj2, adj3]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;
            context['adj3'] = adj3;

            context['a2'] = Formula['pin'](context['0'], context['adj2'], context['50000']);
            context['maxAdj1'] = Formula['*/'](context['a2'], context['2'], context['1']);
            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['maxAdj1']);
            context['maxAdj3'] = Formula['+-'](context['100000'], context['0'], context['maxAdj1']);
            context['a3'] = Formula['pin'](context['0'], context['adj3'], context['maxAdj3']);
            context['x1'] = Formula['*/'](context['ss'], context['a3'], context['100000']);
            context['dx2'] = Formula['*/'](context['ss'], context['a2'], context['50000']);
            context['x2'] = Formula['+-'](context['r'], context['0'], context['dx2']);
            context['y2'] = Formula['+-'](context['b'], context['0'], context['dx2']);
            context['dx4'] = Formula['*/'](context['ss'], context['a2'], context['100000']);
            context['x4'] = Formula['+-'](context['r'], context['0'], context['dx4']);
            context['y4'] = Formula['+-'](context['b'], context['0'], context['dx4']);
            context['dx3'] = Formula['*/'](context['ss'], context['a1'], context['200000']);
            context['x3'] = Formula['+-'](context['x4'], context['0'], context['dx3']);
            context['x5'] = Formula['+-'](context['x4'], context['dx3'], context['0']);
            context['y3'] = Formula['+-'](context['y4'], context['0'], context['dx3']);
            context['y5'] = Formula['+-'](context['y4'], context['dx3'], context['0']);
            context['il'] = Formula['*/'](context['dx3'], context['x1'], context['dx4']);
            context['cx1'] = Formula['+/'](context['x1'], context['x5'], context['2']);
            context['cy1'] = Formula['+/'](context['x1'], context['y5'], context['2']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['y4'])} ${lineTo(
                            context,
                            context['x1'],
                            context['y2']
                        )} ${lineTo(context, context['x1'], context['y3'])} ${lineTo(
                            context,
                            context['x3'],
                            context['y3']
                        )} ${lineTo(context, context['x3'], context['x1'])} ${lineTo(
                            context,
                            context['x2'],
                            context['x1']
                        )} ${lineTo(context, context['x4'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['x1']
                        )} ${lineTo(context, context['x5'], context['x1'])} ${lineTo(
                            context,
                            context['x5'],
                            context['y5']
                        )} ${lineTo(context, context['x1'], context['y5'])} ${lineTo(
                            context,
                            context['x1'],
                            context['b']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.LIGHTNING_BOLT]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            context['x1'] = Formula['*/'](context['w'], context['5022'], context['21600']);
            context['x3'] = Formula['*/'](context['w'], context['8472'], context['21600']);
            context['x4'] = Formula['*/'](context['w'], context['8757'], context['21600']);
            context['x5'] = Formula['*/'](context['w'], context['10012'], context['21600']);
            context['x8'] = Formula['*/'](context['w'], context['12860'], context['21600']);
            context['x9'] = Formula['*/'](context['w'], context['13917'], context['21600']);
            context['x11'] = Formula['*/'](context['w'], context['16577'], context['21600']);
            context['y1'] = Formula['*/'](context['h'], context['3890'], context['21600']);
            context['y2'] = Formula['*/'](context['h'], context['6080'], context['21600']);
            context['y4'] = Formula['*/'](context['h'], context['7437'], context['21600']);
            context['y6'] = Formula['*/'](context['h'], context['9705'], context['21600']);
            context['y7'] = Formula['*/'](context['h'], context['12007'], context['21600']);
            context['y10'] = Formula['*/'](context['h'], context['14277'], context['21600']);
            context['y11'] = Formula['*/'](context['h'], context['14915'], context['21600']);

            return [
                {
                    d: path(context, { w: 21600, h: 21600 }, () => {
                        return `${moveTo(context, context['8472'], context['0'])} ${lineTo(
                            context,
                            context['12860'],
                            context['6080']
                        )} ${lineTo(context, context['11050'], context['6797'])} ${lineTo(
                            context,
                            context['16577'],
                            context['12007']
                        )} ${lineTo(context, context['14767'], context['12877'])} ${lineTo(
                            context,
                            context['21600'],
                            context['21600']
                        )} ${lineTo(context, context['10012'], context['14915'])} ${lineTo(
                            context,
                            context['12222'],
                            context['13987']
                        )} ${lineTo(context, context['5022'], context['9705'])} ${lineTo(
                            context,
                            context['7602'],
                            context['8382']
                        )} ${lineTo(context, context['0'], context['3890'])} ${close(context)}`;
                    }),
                    attrs: { w: 21600, h: 21600 },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.LINE]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['b']
                        )}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.LINE_INV]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['b'])} ${lineTo(
                            context,
                            context['r'],
                            context['t']
                        )}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.MATH_DIVIDE]: {
        editable: true,
        defaultValue: [23520, 5880, 11760],
        defaultKey: ['adj1', 'adj2', 'adj3'],
        formula: (width: number, height: number, [adj1, adj2, adj3]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;
            context['adj3'] = adj3;

            context['a1'] = Formula['pin'](context['1000'], context['adj1'], context['36745']);
            context['ma1'] = Formula['+-'](context['0'], context['0'], context['a1']);
            context['ma3h'] = Formula['+/'](context['73490'], context['ma1'], context['4']);
            context['ma3w'] = Formula['*/'](context['36745'], context['w'], context['h']);
            context['maxAdj3'] = Formula['min'](context['ma3h'], context['ma3w']);
            context['a3'] = Formula['pin'](context['1000'], context['adj3'], context['maxAdj3']);
            context['m4a3'] = Formula['*/'](context['-4'], context['a3'], context['1']);
            context['maxAdj2'] = Formula['+-'](context['73490'], context['m4a3'], context['a1']);
            context['a2'] = Formula['pin'](context['0'], context['adj2'], context['maxAdj2']);
            context['dy1'] = Formula['*/'](context['h'], context['a1'], context['200000']);
            context['yg'] = Formula['*/'](context['h'], context['a2'], context['100000']);
            context['rad'] = Formula['*/'](context['h'], context['a3'], context['100000']);
            context['dx1'] = Formula['*/'](context['w'], context['73490'], context['200000']);
            context['y3'] = Formula['+-'](context['vc'], context['0'], context['dy1']);
            context['y4'] = Formula['+-'](context['vc'], context['dy1'], context['0']);
            context['a'] = Formula['+-'](context['yg'], context['rad'], context['0']);
            context['y2'] = Formula['+-'](context['y3'], context['0'], context['a']);
            context['y1'] = Formula['+-'](context['y2'], context['0'], context['rad']);
            context['y5'] = Formula['+-'](context['b'], context['0'], context['y1']);
            context['x1'] = Formula['+-'](context['hc'], context['0'], context['dx1']);
            context['x3'] = Formula['+-'](context['hc'], context['dx1'], context['0']);
            context['x2'] = Formula['+-'](context['hc'], context['0'], context['rad']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['hc'], context['y1'])} ${arcTo(
                            context,
                            context['rad'],
                            context['rad'],
                            context['3cd4'],
                            context['21600000']
                        )} ${close(context)} ${moveTo(
                            context,
                            context['hc'],
                            context['y5']
                        )} ${arcTo(
                            context,
                            context['rad'],
                            context['rad'],
                            context['cd4'],
                            context['21600000']
                        )} ${close(context)} ${moveTo(
                            context,
                            context['x1'],
                            context['y3']
                        )} ${lineTo(context, context['x3'], context['y3'])} ${lineTo(
                            context,
                            context['x3'],
                            context['y4']
                        )} ${lineTo(context, context['x1'], context['y4'])} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.MATH_EQUAL]: {
        editable: true,
        defaultValue: [23520, 11760],
        defaultKey: ['adj1', 'adj2'],
        formula: (width: number, height: number, [adj1, adj2]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;

            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['36745']);
            context['2a1'] = Formula['*/'](context['a1'], context['2'], context['1']);
            context['mAdj2'] = Formula['+-'](context['100000'], context['0'], context['2a1']);
            context['a2'] = Formula['pin'](context['0'], context['adj2'], context['mAdj2']);
            context['dy1'] = Formula['*/'](context['h'], context['a1'], context['100000']);
            context['dy2'] = Formula['*/'](context['h'], context['a2'], context['200000']);
            context['dx1'] = Formula['*/'](context['w'], context['73490'], context['200000']);
            context['y2'] = Formula['+-'](context['vc'], context['0'], context['dy2']);
            context['y3'] = Formula['+-'](context['vc'], context['dy2'], context['0']);
            context['y1'] = Formula['+-'](context['y2'], context['0'], context['dy1']);
            context['y4'] = Formula['+-'](context['y3'], context['dy1'], context['0']);
            context['x1'] = Formula['+-'](context['hc'], context['0'], context['dx1']);
            context['x2'] = Formula['+-'](context['hc'], context['dx1'], context['0']);
            context['yC1'] = Formula['+/'](context['y1'], context['y2'], context['2']);
            context['yC2'] = Formula['+/'](context['y3'], context['y4'], context['2']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['x1'], context['y1'])} ${lineTo(
                            context,
                            context['x2'],
                            context['y1']
                        )} ${lineTo(context, context['x2'], context['y2'])} ${lineTo(
                            context,
                            context['x1'],
                            context['y2']
                        )} ${close(context)} ${moveTo(
                            context,
                            context['x1'],
                            context['y3']
                        )} ${lineTo(context, context['x2'], context['y3'])} ${lineTo(
                            context,
                            context['x2'],
                            context['y4']
                        )} ${lineTo(context, context['x1'], context['y4'])} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.MATH_MINUS]: {
        editable: true,
        defaultValue: [23520],
        defaultKey: ['adj1'],
        formula: (width: number, height: number, [adj1]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;

            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['100000']);
            context['dy1'] = Formula['*/'](context['h'], context['a1'], context['200000']);
            context['dx1'] = Formula['*/'](context['w'], context['73490'], context['200000']);
            context['y1'] = Formula['+-'](context['vc'], context['0'], context['dy1']);
            context['y2'] = Formula['+-'](context['vc'], context['dy1'], context['0']);
            context['x1'] = Formula['+-'](context['hc'], context['0'], context['dx1']);
            context['x2'] = Formula['+-'](context['hc'], context['dx1'], context['0']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['x1'], context['y1'])} ${lineTo(
                            context,
                            context['x2'],
                            context['y1']
                        )} ${lineTo(context, context['x2'], context['y2'])} ${lineTo(
                            context,
                            context['x1'],
                            context['y2']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.MATH_MULTIPLY]: {
        editable: true,
        defaultValue: [23520],
        defaultKey: ['adj1'],
        formula: (width: number, height: number, [adj1]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;

            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['51965']);
            context['th'] = Formula['*/'](context['ss'], context['a1'], context['100000']);
            context['a'] = Formula['at2'](context['w'], context['h']);
            context['sa'] = Formula['sin'](context['1'], context['a']);
            context['ca'] = Formula['cos'](context['1'], context['a']);
            context['ta'] = Formula['tan'](context['1'], context['a']);
            context['dl'] = Formula['mod'](context['w'], context['h'], context['0']);
            context['rw'] = Formula['*/'](context['dl'], context['51965'], context['100000']);
            context['lM'] = Formula['+-'](context['dl'], context['0'], context['rw']);
            context['xM'] = Formula['*/'](context['ca'], context['lM'], context['2']);
            context['yM'] = Formula['*/'](context['sa'], context['lM'], context['2']);
            context['dxAM'] = Formula['*/'](context['sa'], context['th'], context['2']);
            context['dyAM'] = Formula['*/'](context['ca'], context['th'], context['2']);
            context['xA'] = Formula['+-'](context['xM'], context['0'], context['dxAM']);
            context['yA'] = Formula['+-'](context['yM'], context['dyAM'], context['0']);
            context['xB'] = Formula['+-'](context['xM'], context['dxAM'], context['0']);
            context['yB'] = Formula['+-'](context['yM'], context['0'], context['dyAM']);
            context['xBC'] = Formula['+-'](context['hc'], context['0'], context['xB']);
            context['yBC'] = Formula['*/'](context['xBC'], context['ta'], context['1']);
            context['yC'] = Formula['+-'](context['yBC'], context['yB'], context['0']);
            context['xD'] = Formula['+-'](context['r'], context['0'], context['xB']);
            context['xE'] = Formula['+-'](context['r'], context['0'], context['xA']);
            context['yFE'] = Formula['+-'](context['vc'], context['0'], context['yA']);
            context['xFE'] = Formula['*/'](context['yFE'], context['1'], context['ta']);
            context['xF'] = Formula['+-'](context['xE'], context['0'], context['xFE']);
            context['xL'] = Formula['+-'](context['xA'], context['xFE'], context['0']);
            context['yG'] = Formula['+-'](context['b'], context['0'], context['yA']);
            context['yH'] = Formula['+-'](context['b'], context['0'], context['yB']);
            context['yI'] = Formula['+-'](context['b'], context['0'], context['yC']);
            context['xC2'] = Formula['+-'](context['r'], context['0'], context['xM']);
            context['yC3'] = Formula['+-'](context['b'], context['0'], context['yM']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['xA'], context['yA'])} ${lineTo(
                            context,
                            context['xB'],
                            context['yB']
                        )} ${lineTo(context, context['hc'], context['yC'])} ${lineTo(
                            context,
                            context['xD'],
                            context['yB']
                        )} ${lineTo(context, context['xE'], context['yA'])} ${lineTo(
                            context,
                            context['xF'],
                            context['vc']
                        )} ${lineTo(context, context['xE'], context['yG'])} ${lineTo(
                            context,
                            context['xD'],
                            context['yH']
                        )} ${lineTo(context, context['hc'], context['yI'])} ${lineTo(
                            context,
                            context['xB'],
                            context['yH']
                        )} ${lineTo(context, context['xA'], context['yG'])} ${lineTo(
                            context,
                            context['xL'],
                            context['vc']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.MATH_NOT_EQUAL]: {
        editable: true,
        defaultValue: [23520, 6600000, 11760],
        defaultKey: ['adj1', 'adj2', 'adj3'],
        formula: (width: number, height: number, [adj1, adj2, adj3]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;
            context['adj3'] = adj3;

            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['50000']);
            context['crAng'] = Formula['pin'](
                context['4200000'],
                context['adj2'],
                context['6600000']
            );
            context['2a1'] = Formula['*/'](context['a1'], context['2'], context['1']);
            context['maxAdj3'] = Formula['+-'](context['100000'], context['0'], context['2a1']);
            context['a3'] = Formula['pin'](context['0'], context['adj3'], context['maxAdj3']);
            context['dy1'] = Formula['*/'](context['h'], context['a1'], context['100000']);
            context['dy2'] = Formula['*/'](context['h'], context['a3'], context['200000']);
            context['dx1'] = Formula['*/'](context['w'], context['73490'], context['200000']);
            context['x1'] = Formula['+-'](context['hc'], context['0'], context['dx1']);
            context['x8'] = Formula['+-'](context['hc'], context['dx1'], context['0']);
            context['y2'] = Formula['+-'](context['vc'], context['0'], context['dy2']);
            context['y3'] = Formula['+-'](context['vc'], context['dy2'], context['0']);
            context['y1'] = Formula['+-'](context['y2'], context['0'], context['dy1']);
            context['y4'] = Formula['+-'](context['y3'], context['dy1'], context['0']);
            context['cadj2'] = Formula['+-'](context['crAng'], context['0'], context['cd4']);
            context['xadj2'] = Formula['tan'](context['hd2'], context['cadj2']);
            context['len'] = Formula['mod'](context['xadj2'], context['hd2'], context['0']);
            context['bhw'] = Formula['*/'](context['len'], context['dy1'], context['hd2']);
            context['bhw2'] = Formula['*/'](context['bhw'], context['1'], context['2']);
            context['x7'] = Formula['+-'](context['hc'], context['xadj2'], context['bhw2']);
            context['dx67'] = Formula['*/'](context['xadj2'], context['y1'], context['hd2']);
            context['x6'] = Formula['+-'](context['x7'], context['0'], context['dx67']);
            context['dx57'] = Formula['*/'](context['xadj2'], context['y2'], context['hd2']);
            context['x5'] = Formula['+-'](context['x7'], context['0'], context['dx57']);
            context['dx47'] = Formula['*/'](context['xadj2'], context['y3'], context['hd2']);
            context['x4'] = Formula['+-'](context['x7'], context['0'], context['dx47']);
            context['dx37'] = Formula['*/'](context['xadj2'], context['y4'], context['hd2']);
            context['x3'] = Formula['+-'](context['x7'], context['0'], context['dx37']);
            context['dx27'] = Formula['*/'](context['xadj2'], context['2'], context['1']);
            context['x2'] = Formula['+-'](context['x7'], context['0'], context['dx27']);
            context['rx7'] = Formula['+-'](context['x7'], context['bhw'], context['0']);
            context['rx6'] = Formula['+-'](context['x6'], context['bhw'], context['0']);
            context['rx5'] = Formula['+-'](context['x5'], context['bhw'], context['0']);
            context['rx4'] = Formula['+-'](context['x4'], context['bhw'], context['0']);
            context['rx3'] = Formula['+-'](context['x3'], context['bhw'], context['0']);
            context['rx2'] = Formula['+-'](context['x2'], context['bhw'], context['0']);
            context['dx7'] = Formula['*/'](context['dy1'], context['hd2'], context['len']);
            context['rxt'] = Formula['+-'](context['x7'], context['dx7'], context['0']);
            context['lxt'] = Formula['+-'](context['rx7'], context['0'], context['dx7']);
            context['rx'] = Formula['?:'](context['cadj2'], context['rxt'], context['rx7']);
            context['lx'] = Formula['?:'](context['cadj2'], context['x7'], context['lxt']);
            context['dy3'] = Formula['*/'](context['dy1'], context['xadj2'], context['len']);
            context['dy4'] = Formula['+-'](context['0'], context['0'], context['dy3']);
            context['ry'] = Formula['?:'](context['cadj2'], context['dy3'], context['t']);
            context['ly'] = Formula['?:'](context['cadj2'], context['t'], context['dy4']);
            context['dlx'] = Formula['+-'](context['w'], context['0'], context['rx']);
            context['drx'] = Formula['+-'](context['w'], context['0'], context['lx']);
            context['dly'] = Formula['+-'](context['h'], context['0'], context['ry']);
            context['dry'] = Formula['+-'](context['h'], context['0'], context['ly']);
            context['xC1'] = Formula['+/'](context['rx'], context['lx'], context['2']);
            context['xC2'] = Formula['+/'](context['drx'], context['dlx'], context['2']);
            context['yC1'] = Formula['+/'](context['ry'], context['ly'], context['2']);
            context['yC2'] = Formula['+/'](context['y1'], context['y2'], context['2']);
            context['yC3'] = Formula['+/'](context['y3'], context['y4'], context['2']);
            context['yC4'] = Formula['+/'](context['dry'], context['dly'], context['2']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['x1'], context['y1'])} ${lineTo(
                            context,
                            context['x6'],
                            context['y1']
                        )} ${lineTo(context, context['lx'], context['ly'])} ${lineTo(
                            context,
                            context['rx'],
                            context['ry']
                        )} ${lineTo(context, context['rx6'], context['y1'])} ${lineTo(
                            context,
                            context['x8'],
                            context['y1']
                        )} ${lineTo(context, context['x8'], context['y2'])} ${lineTo(
                            context,
                            context['rx5'],
                            context['y2']
                        )} ${lineTo(context, context['rx4'], context['y3'])} ${lineTo(
                            context,
                            context['x8'],
                            context['y3']
                        )} ${lineTo(context, context['x8'], context['y4'])} ${lineTo(
                            context,
                            context['rx3'],
                            context['y4']
                        )} ${lineTo(context, context['drx'], context['dry'])} ${lineTo(
                            context,
                            context['dlx'],
                            context['dly']
                        )} ${lineTo(context, context['x3'], context['y4'])} ${lineTo(
                            context,
                            context['x1'],
                            context['y4']
                        )} ${lineTo(context, context['x1'], context['y3'])} ${lineTo(
                            context,
                            context['x4'],
                            context['y3']
                        )} ${lineTo(context, context['x5'], context['y2'])} ${lineTo(
                            context,
                            context['x1'],
                            context['y2']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.MATH_PLUS]: {
        editable: true,
        defaultValue: [23520],
        defaultKey: ['adj1'],
        formula: (width: number, height: number, [adj1]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;

            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['73490']);
            context['dx1'] = Formula['*/'](context['w'], context['73490'], context['200000']);
            context['dy1'] = Formula['*/'](context['h'], context['73490'], context['200000']);
            context['dx2'] = Formula['*/'](context['ss'], context['a1'], context['200000']);
            context['x1'] = Formula['+-'](context['hc'], context['0'], context['dx1']);
            context['x2'] = Formula['+-'](context['hc'], context['0'], context['dx2']);
            context['x3'] = Formula['+-'](context['hc'], context['dx2'], context['0']);
            context['x4'] = Formula['+-'](context['hc'], context['dx1'], context['0']);
            context['y1'] = Formula['+-'](context['vc'], context['0'], context['dy1']);
            context['y2'] = Formula['+-'](context['vc'], context['0'], context['dx2']);
            context['y3'] = Formula['+-'](context['vc'], context['dx2'], context['0']);
            context['y4'] = Formula['+-'](context['vc'], context['dy1'], context['0']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['x1'], context['y2'])} ${lineTo(
                            context,
                            context['x2'],
                            context['y2']
                        )} ${lineTo(context, context['x2'], context['y1'])} ${lineTo(
                            context,
                            context['x3'],
                            context['y1']
                        )} ${lineTo(context, context['x3'], context['y2'])} ${lineTo(
                            context,
                            context['x4'],
                            context['y2']
                        )} ${lineTo(context, context['x4'], context['y3'])} ${lineTo(
                            context,
                            context['x3'],
                            context['y3']
                        )} ${lineTo(context, context['x3'], context['y4'])} ${lineTo(
                            context,
                            context['x2'],
                            context['y4']
                        )} ${lineTo(context, context['x2'], context['y3'])} ${lineTo(
                            context,
                            context['x1'],
                            context['y3']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.MOON]: {
        editable: true,
        defaultValue: [50000],
        defaultKey: ['adj'],
        formula: (width: number, height: number, [adj]: number[]) => {
            const context = getContext(width, height);
            context['adj'] = adj;

            context['a'] = Formula['pin'](context['0'], context['adj'], context['87500']);
            context['g0'] = Formula['*/'](context['ss'], context['a'], context['100000']);
            context['g0w'] = Formula['*/'](context['g0'], context['w'], context['ss']);
            context['g1'] = Formula['+-'](context['ss'], context['0'], context['g0']);
            context['g2'] = Formula['*/'](context['g0'], context['g0'], context['g1']);
            context['g3'] = Formula['*/'](context['ss'], context['ss'], context['g1']);
            context['g4'] = Formula['*/'](context['g3'], context['2'], context['1']);
            context['g5'] = Formula['+-'](context['g4'], context['0'], context['g2']);
            context['g6'] = Formula['+-'](context['g5'], context['0'], context['g0']);
            context['g6w'] = Formula['*/'](context['g6'], context['w'], context['ss']);
            context['g7'] = Formula['*/'](context['g5'], context['1'], context['2']);
            context['g8'] = Formula['+-'](context['g7'], context['0'], context['g0']);
            context['dy1'] = Formula['*/'](context['g8'], context['hd2'], context['ss']);
            context['g10h'] = Formula['+-'](context['vc'], context['0'], context['dy1']);
            context['g11h'] = Formula['+-'](context['vc'], context['dy1'], context['0']);
            context['g12'] = Formula['*/'](context['g0'], context['9598'], context['32768']);
            context['g12w'] = Formula['*/'](context['g12'], context['w'], context['ss']);
            context['g13'] = Formula['+-'](context['ss'], context['0'], context['g12']);
            context['q1'] = Formula['*/'](context['ss'], context['ss'], context['1']);
            context['q2'] = Formula['*/'](context['g13'], context['g13'], context['1']);
            context['q3'] = Formula['+-'](context['q1'], context['0'], context['q2']);
            context['q4'] = Formula['sqrt'](context['q3']);
            context['dy4'] = Formula['*/'](context['q4'], context['hd2'], context['ss']);
            context['g15h'] = Formula['+-'](context['vc'], context['0'], context['dy4']);
            context['g16h'] = Formula['+-'](context['vc'], context['dy4'], context['0']);
            context['g17w'] = Formula['+-'](context['g6w'], context['0'], context['g0w']);
            context['g18w'] = Formula['*/'](context['g17w'], context['1'], context['2']);
            context['dx2p'] = Formula['+-'](context['g0w'], context['g18w'], context['w']);
            context['dx2'] = Formula['*/'](context['dx2p'], context['-1'], context['1']);
            context['dy2'] = Formula['*/'](context['hd2'], context['-1'], context['1']);
            context['stAng1'] = Formula['at2'](context['dx2'], context['dy2']);
            context['enAngp1'] = Formula['at2'](context['dx2'], context['hd2']);
            context['enAng1'] = Formula['+-'](
                context['enAngp1'],
                context['0'],
                context['21600000']
            );
            context['swAng1'] = Formula['+-'](context['enAng1'], context['0'], context['stAng1']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['r'], context['b'])} ${arcTo(
                            context,
                            context['w'],
                            context['hd2'],
                            context['cd4'],
                            context['cd2']
                        )} ${arcTo(
                            context,
                            context['g18w'],
                            context['dy1'],
                            context['stAng1'],
                            context['swAng1']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.NON_ISOSCELES_TRAPEZOID]: {
        editable: true,
        defaultValue: [25000, 25000],
        defaultKey: ['adj1', 'adj2'],
        formula: (width: number, height: number, [adj1, adj2]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;

            context['maxAdj'] = Formula['*/'](context['50000'], context['w'], context['ss']);
            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['maxAdj']);
            context['a2'] = Formula['pin'](context['0'], context['adj2'], context['maxAdj']);
            context['x1'] = Formula['*/'](context['ss'], context['a1'], context['200000']);
            context['x2'] = Formula['*/'](context['ss'], context['a1'], context['100000']);
            context['dx3'] = Formula['*/'](context['ss'], context['a2'], context['100000']);
            context['x3'] = Formula['+-'](context['r'], context['0'], context['dx3']);
            context['x4'] = Formula['+/'](context['r'], context['x3'], context['2']);
            context['il'] = Formula['*/'](context['wd3'], context['a1'], context['maxAdj']);
            context['adjm'] = Formula['max'](context['a1'], context['a2']);
            context['it'] = Formula['*/'](context['hd3'], context['adjm'], context['maxAdj']);
            context['irt'] = Formula['*/'](context['wd3'], context['a2'], context['maxAdj']);
            context['ir'] = Formula['+-'](context['r'], context['0'], context['irt']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['b'])} ${lineTo(
                            context,
                            context['x2'],
                            context['t']
                        )} ${lineTo(context, context['x3'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['b']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.NO_SMOKING]: {
        editable: true,
        defaultValue: [18750],
        defaultKey: ['adj'],
        formula: (width: number, height: number, [adj]: number[]) => {
            const context = getContext(width, height);
            context['adj'] = adj;

            context['a'] = Formula['pin'](context['0'], context['adj'], context['50000']);
            context['dr'] = Formula['*/'](context['ss'], context['a'], context['100000']);
            context['iwd2'] = Formula['+-'](context['wd2'], context['0'], context['dr']);
            context['ihd2'] = Formula['+-'](context['hd2'], context['0'], context['dr']);
            context['ang'] = Formula['at2'](context['w'], context['h']);
            context['ct'] = Formula['cos'](context['ihd2'], context['ang']);
            context['st'] = Formula['sin'](context['iwd2'], context['ang']);
            context['m'] = Formula['mod'](context['ct'], context['st'], context['0']);
            context['n'] = Formula['*/'](context['iwd2'], context['ihd2'], context['m']);
            context['drd2'] = Formula['*/'](context['dr'], context['1'], context['2']);
            context['dang'] = Formula['at2'](context['n'], context['drd2']);
            context['2dang'] = Formula['*/'](context['dang'], context['2'], context['1']);
            context['swAng'] = Formula['+-'](context['-10800000'], context['2dang'], context['0']);
            context['t3'] = Formula['at2'](context['w'], context['h']);
            context['stAng1'] = Formula['+-'](context['t3'], context['0'], context['dang']);
            context['stAng2'] = Formula['+-'](context['stAng1'], context['0'], context['cd2']);
            context['ct1'] = Formula['cos'](context['ihd2'], context['stAng1']);
            context['st1'] = Formula['sin'](context['iwd2'], context['stAng1']);
            context['m1'] = Formula['mod'](context['ct1'], context['st1'], context['0']);
            context['n1'] = Formula['*/'](context['iwd2'], context['ihd2'], context['m1']);
            context['dx1'] = Formula['cos'](context['n1'], context['stAng1']);
            context['dy1'] = Formula['sin'](context['n1'], context['stAng1']);
            context['x1'] = Formula['+-'](context['hc'], context['dx1'], context['0']);
            context['y1'] = Formula['+-'](context['vc'], context['dy1'], context['0']);
            context['x2'] = Formula['+-'](context['hc'], context['0'], context['dx1']);
            context['y2'] = Formula['+-'](context['vc'], context['0'], context['dy1']);
            context['idx'] = Formula['cos'](context['wd2'], context['2700000']);
            context['idy'] = Formula['sin'](context['hd2'], context['2700000']);
            context['il'] = Formula['+-'](context['hc'], context['0'], context['idx']);
            context['ir'] = Formula['+-'](context['hc'], context['idx'], context['0']);
            context['it'] = Formula['+-'](context['vc'], context['0'], context['idy']);
            context['ib'] = Formula['+-'](context['vc'], context['idy'], context['0']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['vc'])} ${arcTo(
                            context,
                            context['wd2'],
                            context['hd2'],
                            context['cd2'],
                            context['cd4']
                        )} ${arcTo(
                            context,
                            context['wd2'],
                            context['hd2'],
                            context['3cd4'],
                            context['cd4']
                        )} ${arcTo(
                            context,
                            context['wd2'],
                            context['hd2'],
                            context['0'],
                            context['cd4']
                        )} ${arcTo(
                            context,
                            context['wd2'],
                            context['hd2'],
                            context['cd4'],
                            context['cd4']
                        )} ${close(context)} ${moveTo(
                            context,
                            context['x1'],
                            context['y1']
                        )} ${arcTo(
                            context,
                            context['iwd2'],
                            context['ihd2'],
                            context['stAng1'],
                            context['swAng']
                        )} ${close(context)} ${moveTo(
                            context,
                            context['x2'],
                            context['y2']
                        )} ${arcTo(
                            context,
                            context['iwd2'],
                            context['ihd2'],
                            context['stAng2'],
                            context['swAng']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.NOTCHED_RIGHT_ARROW]: {
        editable: true,
        defaultValue: [50000, 50000],
        defaultKey: ['adj1', 'adj2'],
        formula: (width: number, height: number, [adj1, adj2]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;

            context['maxAdj2'] = Formula['*/'](context['100000'], context['w'], context['ss']);
            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['100000']);
            context['a2'] = Formula['pin'](context['0'], context['adj2'], context['maxAdj2']);
            context['dx2'] = Formula['*/'](context['ss'], context['a2'], context['100000']);
            context['x2'] = Formula['+-'](context['r'], context['0'], context['dx2']);
            context['dy1'] = Formula['*/'](context['h'], context['a1'], context['200000']);
            context['y1'] = Formula['+-'](context['vc'], context['0'], context['dy1']);
            context['y2'] = Formula['+-'](context['vc'], context['dy1'], context['0']);
            context['x1'] = Formula['*/'](context['dy1'], context['dx2'], context['hd2']);
            context['x3'] = Formula['+-'](context['r'], context['0'], context['x1']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['y1'])} ${lineTo(
                            context,
                            context['x2'],
                            context['y1']
                        )} ${lineTo(context, context['x2'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['vc']
                        )} ${lineTo(context, context['x2'], context['b'])} ${lineTo(
                            context,
                            context['x2'],
                            context['y2']
                        )} ${lineTo(context, context['l'], context['y2'])} ${lineTo(
                            context,
                            context['x1'],
                            context['vc']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.OCTAGON]: {
        editable: true,
        defaultValue: [29289],
        defaultKey: ['adj'],
        formula: (width: number, height: number, [adj]: number[]) => {
            const context = getContext(width, height);
            context['adj'] = adj;

            context['a'] = Formula['pin'](context['0'], context['adj'], context['50000']);
            context['x1'] = Formula['*/'](context['ss'], context['a'], context['100000']);
            context['x2'] = Formula['+-'](context['r'], context['0'], context['x1']);
            context['y2'] = Formula['+-'](context['b'], context['0'], context['x1']);
            context['il'] = Formula['*/'](context['x1'], context['1'], context['2']);
            context['ir'] = Formula['+-'](context['r'], context['0'], context['il']);
            context['ib'] = Formula['+-'](context['b'], context['0'], context['il']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['x1'])} ${lineTo(
                            context,
                            context['x1'],
                            context['t']
                        )} ${lineTo(context, context['x2'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['x1']
                        )} ${lineTo(context, context['r'], context['y2'])} ${lineTo(
                            context,
                            context['x2'],
                            context['b']
                        )} ${lineTo(context, context['x1'], context['b'])} ${lineTo(
                            context,
                            context['l'],
                            context['y2']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.PARALLELOGRAM]: {
        editable: true,
        defaultValue: [25000],
        defaultKey: ['adj'],
        formula: (width: number, height: number, [adj]: number[]) => {
            const context = getContext(width, height);
            context['adj'] = adj;

            context['maxAdj'] = Formula['*/'](context['100000'], context['w'], context['ss']);
            context['a'] = Formula['pin'](context['0'], context['adj'], context['maxAdj']);
            context['x1'] = Formula['*/'](context['ss'], context['a'], context['200000']);
            context['x2'] = Formula['*/'](context['ss'], context['a'], context['100000']);
            context['x6'] = Formula['+-'](context['r'], context['0'], context['x1']);
            context['x5'] = Formula['+-'](context['r'], context['0'], context['x2']);
            context['x3'] = Formula['*/'](context['x5'], context['1'], context['2']);
            context['x4'] = Formula['+-'](context['r'], context['0'], context['x3']);
            context['il'] = Formula['*/'](context['wd2'], context['a'], context['maxAdj']);
            context['q1'] = Formula['*/'](context['5'], context['a'], context['maxAdj']);
            context['q2'] = Formula['+/'](context['1'], context['q1'], context['12']);
            context['il'] = Formula['*/'](context['q2'], context['w'], context['1']);
            context['it'] = Formula['*/'](context['q2'], context['h'], context['1']);
            context['ir'] = Formula['+-'](context['r'], context['0'], context['il']);
            context['ib'] = Formula['+-'](context['b'], context['0'], context['it']);
            context['q3'] = Formula['*/'](context['h'], context['hc'], context['x2']);
            context['y1'] = Formula['pin'](context['0'], context['q3'], context['h']);
            context['y2'] = Formula['+-'](context['b'], context['0'], context['y1']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['b'])} ${lineTo(
                            context,
                            context['x2'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['t'])} ${lineTo(
                            context,
                            context['x5'],
                            context['b']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.PENTAGON]: {
        editable: true,
        defaultValue: [105146, 110557],
        defaultKey: ['hf', 'vf'],
        formula: (width: number, height: number, [hf, vf]: number[]) => {
            const context = getContext(width, height);
            context['hf'] = hf;
            context['vf'] = vf;

            context['swd2'] = Formula['*/'](context['wd2'], context['hf'], context['100000']);
            context['shd2'] = Formula['*/'](context['hd2'], context['vf'], context['100000']);
            context['svc'] = Formula['*/'](context['vc'], context['vf'], context['100000']);
            context['dx1'] = Formula['cos'](context['swd2'], context['1080000']);
            context['dx2'] = Formula['cos'](context['swd2'], context['18360000']);
            context['dy1'] = Formula['sin'](context['shd2'], context['1080000']);
            context['dy2'] = Formula['sin'](context['shd2'], context['18360000']);
            context['x1'] = Formula['+-'](context['hc'], context['0'], context['dx1']);
            context['x2'] = Formula['+-'](context['hc'], context['0'], context['dx2']);
            context['x3'] = Formula['+-'](context['hc'], context['dx2'], context['0']);
            context['x4'] = Formula['+-'](context['hc'], context['dx1'], context['0']);
            context['y1'] = Formula['+-'](context['svc'], context['0'], context['dy1']);
            context['y2'] = Formula['+-'](context['svc'], context['0'], context['dy2']);
            context['it'] = Formula['*/'](context['y1'], context['dx2'], context['dx1']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['x1'], context['y1'])} ${lineTo(
                            context,
                            context['hc'],
                            context['t']
                        )} ${lineTo(context, context['x4'], context['y1'])} ${lineTo(
                            context,
                            context['x3'],
                            context['y2']
                        )} ${lineTo(context, context['x2'], context['y2'])} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.PIE]: {
        editable: true,
        defaultValue: [0, 16200000],
        defaultKey: ['adj1', 'adj2'],
        formula: (width: number, height: number, [adj1, adj2]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;

            context['stAng'] = Formula['pin'](context['0'], context['adj1'], context['21599999']);
            context['enAng'] = Formula['pin'](context['0'], context['adj2'], context['21599999']);
            context['sw1'] = Formula['+-'](context['enAng'], context['0'], context['stAng']);
            context['sw2'] = Formula['+-'](context['sw1'], context['21600000'], context['0']);
            context['swAng'] = Formula['?:'](context['sw1'], context['sw1'], context['sw2']);
            context['wt1'] = Formula['sin'](context['wd2'], context['stAng']);
            context['ht1'] = Formula['cos'](context['hd2'], context['stAng']);
            context['dx1'] = Formula['cat2'](context['wd2'], context['ht1'], context['wt1']);
            context['dy1'] = Formula['sat2'](context['hd2'], context['ht1'], context['wt1']);
            context['x1'] = Formula['+-'](context['hc'], context['dx1'], context['0']);
            context['y1'] = Formula['+-'](context['vc'], context['dy1'], context['0']);
            context['wt2'] = Formula['sin'](context['wd2'], context['enAng']);
            context['ht2'] = Formula['cos'](context['hd2'], context['enAng']);
            context['dx2'] = Formula['cat2'](context['wd2'], context['ht2'], context['wt2']);
            context['dy2'] = Formula['sat2'](context['hd2'], context['ht2'], context['wt2']);
            context['x2'] = Formula['+-'](context['hc'], context['dx2'], context['0']);
            context['y2'] = Formula['+-'](context['vc'], context['dy2'], context['0']);
            context['idx'] = Formula['cos'](context['wd2'], context['2700000']);
            context['idy'] = Formula['sin'](context['hd2'], context['2700000']);
            context['il'] = Formula['+-'](context['hc'], context['0'], context['idx']);
            context['ir'] = Formula['+-'](context['hc'], context['idx'], context['0']);
            context['it'] = Formula['+-'](context['vc'], context['0'], context['idy']);
            context['ib'] = Formula['+-'](context['vc'], context['idy'], context['0']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['x1'], context['y1'])} ${arcTo(
                            context,
                            context['wd2'],
                            context['hd2'],
                            context['stAng'],
                            context['swAng']
                        )} ${lineTo(context, context['hc'], context['vc'])} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.PIE_WEDGE]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            context['g1'] = Formula['cos'](context['w'], context['13500000']);
            context['g2'] = Formula['sin'](context['h'], context['13500000']);
            context['x1'] = Formula['+-'](context['r'], context['g1'], context['0']);
            context['y1'] = Formula['+-'](context['b'], context['g2'], context['0']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['b'])} ${arcTo(
                            context,
                            context['w'],
                            context['h'],
                            context['cd2'],
                            context['cd4']
                        )} ${lineTo(context, context['r'], context['b'])} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.PLAQUE]: {
        editable: true,
        defaultValue: [16667],
        defaultKey: ['adj'],
        formula: (width: number, height: number, [adj]: number[]) => {
            const context = getContext(width, height);
            context['adj'] = adj;

            context['a'] = Formula['pin'](context['0'], context['adj'], context['50000']);
            context['x1'] = Formula['*/'](context['ss'], context['a'], context['100000']);
            context['x2'] = Formula['+-'](context['r'], context['0'], context['x1']);
            context['y2'] = Formula['+-'](context['b'], context['0'], context['x1']);
            context['il'] = Formula['*/'](context['x1'], context['70711'], context['100000']);
            context['ir'] = Formula['+-'](context['r'], context['0'], context['il']);
            context['ib'] = Formula['+-'](context['b'], context['0'], context['il']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['x1'])} ${arcTo(
                            context,
                            context['x1'],
                            context['x1'],
                            context['cd4'],
                            context['-5400000']
                        )} ${lineTo(context, context['x2'], context['t'])} ${arcTo(
                            context,
                            context['x1'],
                            context['x1'],
                            context['cd2'],
                            context['-5400000']
                        )} ${lineTo(context, context['r'], context['y2'])} ${arcTo(
                            context,
                            context['x1'],
                            context['x1'],
                            context['3cd4'],
                            context['-5400000']
                        )} ${lineTo(context, context['x1'], context['b'])} ${arcTo(
                            context,
                            context['x1'],
                            context['x1'],
                            context['0'],
                            context['-5400000']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.PLAQUE_TABS]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            context['md'] = Formula['mod'](context['w'], context['h'], context['0']);
            context['dx'] = Formula['*/'](context['1'], context['md'], context['20']);
            context['y1'] = Formula['+-'](context['0'], context['b'], context['dx']);
            context['x1'] = Formula['+-'](context['0'], context['r'], context['dx']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['dx'],
                            context['t']
                        )} ${arcTo(
                            context,
                            context['dx'],
                            context['dx'],
                            context['0'],
                            context['cd4']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['y1'])} ${arcTo(
                            context,
                            context['dx'],
                            context['dx'],
                            context['3cd4'],
                            context['cd4']
                        )} ${lineTo(context, context['l'], context['b'])} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['r'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['dx']
                        )} ${arcTo(
                            context,
                            context['dx'],
                            context['dx'],
                            context['cd4'],
                            context['cd4']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['x1'], context['b'])} ${arcTo(
                            context,
                            context['dx'],
                            context['dx'],
                            context['cd2'],
                            context['cd4']
                        )} ${lineTo(context, context['r'], context['b'])} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.PLUS]: {
        editable: true,
        defaultValue: [25000],
        defaultKey: ['adj'],
        formula: (width: number, height: number, [adj]: number[]) => {
            const context = getContext(width, height);
            context['adj'] = adj;

            context['a'] = Formula['pin'](context['0'], context['adj'], context['50000']);
            context['x1'] = Formula['*/'](context['ss'], context['a'], context['100000']);
            context['x2'] = Formula['+-'](context['r'], context['0'], context['x1']);
            context['y2'] = Formula['+-'](context['b'], context['0'], context['x1']);
            context['d'] = Formula['+-'](context['w'], context['0'], context['h']);
            context['il'] = Formula['?:'](context['d'], context['l'], context['x1']);
            context['ir'] = Formula['?:'](context['d'], context['r'], context['x2']);
            context['it'] = Formula['?:'](context['d'], context['x1'], context['t']);
            context['ib'] = Formula['?:'](context['d'], context['y2'], context['b']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['x1'])} ${lineTo(
                            context,
                            context['x1'],
                            context['x1']
                        )} ${lineTo(context, context['x1'], context['t'])} ${lineTo(
                            context,
                            context['x2'],
                            context['t']
                        )} ${lineTo(context, context['x2'], context['x1'])} ${lineTo(
                            context,
                            context['r'],
                            context['x1']
                        )} ${lineTo(context, context['r'], context['y2'])} ${lineTo(
                            context,
                            context['x2'],
                            context['y2']
                        )} ${lineTo(context, context['x2'], context['b'])} ${lineTo(
                            context,
                            context['x1'],
                            context['b']
                        )} ${lineTo(context, context['x1'], context['y2'])} ${lineTo(
                            context,
                            context['l'],
                            context['y2']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.QUAD_ARROW]: {
        editable: true,
        defaultValue: [22500, 22500, 22500],
        defaultKey: ['adj1', 'adj2', 'adj3'],
        formula: (width: number, height: number, [adj1, adj2, adj3]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;
            context['adj3'] = adj3;

            context['a2'] = Formula['pin'](context['0'], context['adj2'], context['50000']);
            context['maxAdj1'] = Formula['*/'](context['a2'], context['2'], context['1']);
            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['maxAdj1']);
            context['q1'] = Formula['+-'](context['100000'], context['0'], context['maxAdj1']);
            context['maxAdj3'] = Formula['*/'](context['q1'], context['1'], context['2']);
            context['a3'] = Formula['pin'](context['0'], context['adj3'], context['maxAdj3']);
            context['x1'] = Formula['*/'](context['ss'], context['a3'], context['100000']);
            context['dx2'] = Formula['*/'](context['ss'], context['a2'], context['100000']);
            context['x2'] = Formula['+-'](context['hc'], context['0'], context['dx2']);
            context['x5'] = Formula['+-'](context['hc'], context['dx2'], context['0']);
            context['dx3'] = Formula['*/'](context['ss'], context['a1'], context['200000']);
            context['x3'] = Formula['+-'](context['hc'], context['0'], context['dx3']);
            context['x4'] = Formula['+-'](context['hc'], context['dx3'], context['0']);
            context['x6'] = Formula['+-'](context['r'], context['0'], context['x1']);
            context['y2'] = Formula['+-'](context['vc'], context['0'], context['dx2']);
            context['y5'] = Formula['+-'](context['vc'], context['dx2'], context['0']);
            context['y3'] = Formula['+-'](context['vc'], context['0'], context['dx3']);
            context['y4'] = Formula['+-'](context['vc'], context['dx3'], context['0']);
            context['y6'] = Formula['+-'](context['b'], context['0'], context['x1']);
            context['il'] = Formula['*/'](context['dx3'], context['x1'], context['dx2']);
            context['ir'] = Formula['+-'](context['r'], context['0'], context['il']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['vc'])} ${lineTo(
                            context,
                            context['x1'],
                            context['y2']
                        )} ${lineTo(context, context['x1'], context['y3'])} ${lineTo(
                            context,
                            context['x3'],
                            context['y3']
                        )} ${lineTo(context, context['x3'], context['x1'])} ${lineTo(
                            context,
                            context['x2'],
                            context['x1']
                        )} ${lineTo(context, context['hc'], context['t'])} ${lineTo(
                            context,
                            context['x5'],
                            context['x1']
                        )} ${lineTo(context, context['x4'], context['x1'])} ${lineTo(
                            context,
                            context['x4'],
                            context['y3']
                        )} ${lineTo(context, context['x6'], context['y3'])} ${lineTo(
                            context,
                            context['x6'],
                            context['y2']
                        )} ${lineTo(context, context['r'], context['vc'])} ${lineTo(
                            context,
                            context['x6'],
                            context['y5']
                        )} ${lineTo(context, context['x6'], context['y4'])} ${lineTo(
                            context,
                            context['x4'],
                            context['y4']
                        )} ${lineTo(context, context['x4'], context['y6'])} ${lineTo(
                            context,
                            context['x5'],
                            context['y6']
                        )} ${lineTo(context, context['hc'], context['b'])} ${lineTo(
                            context,
                            context['x2'],
                            context['y6']
                        )} ${lineTo(context, context['x3'], context['y6'])} ${lineTo(
                            context,
                            context['x3'],
                            context['y4']
                        )} ${lineTo(context, context['x1'], context['y4'])} ${lineTo(
                            context,
                            context['x1'],
                            context['y5']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.QUAD_ARROW_CALLOUT]: {
        editable: true,
        defaultValue: [18515, 18515, 18515, 48123],
        defaultKey: ['adj1', 'adj2', 'adj3', 'adj4'],
        formula: (width: number, height: number, [adj1, adj2, adj3, adj4]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;
            context['adj3'] = adj3;
            context['adj4'] = adj4;

            context['a2'] = Formula['pin'](context['0'], context['adj2'], context['50000']);
            context['maxAdj1'] = Formula['*/'](context['a2'], context['2'], context['1']);
            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['maxAdj1']);
            context['maxAdj3'] = Formula['+-'](context['50000'], context['0'], context['a2']);
            context['a3'] = Formula['pin'](context['0'], context['adj3'], context['maxAdj3']);
            context['q2'] = Formula['*/'](context['a3'], context['2'], context['1']);
            context['maxAdj4'] = Formula['+-'](context['100000'], context['0'], context['q2']);
            context['a4'] = Formula['pin'](context['a1'], context['adj4'], context['maxAdj4']);
            context['dx2'] = Formula['*/'](context['ss'], context['a2'], context['100000']);
            context['dx3'] = Formula['*/'](context['ss'], context['a1'], context['200000']);
            context['ah'] = Formula['*/'](context['ss'], context['a3'], context['100000']);
            context['dx1'] = Formula['*/'](context['w'], context['a4'], context['200000']);
            context['dy1'] = Formula['*/'](context['h'], context['a4'], context['200000']);
            context['x8'] = Formula['+-'](context['r'], context['0'], context['ah']);
            context['x2'] = Formula['+-'](context['hc'], context['0'], context['dx1']);
            context['x7'] = Formula['+-'](context['hc'], context['dx1'], context['0']);
            context['x3'] = Formula['+-'](context['hc'], context['0'], context['dx2']);
            context['x6'] = Formula['+-'](context['hc'], context['dx2'], context['0']);
            context['x4'] = Formula['+-'](context['hc'], context['0'], context['dx3']);
            context['x5'] = Formula['+-'](context['hc'], context['dx3'], context['0']);
            context['y8'] = Formula['+-'](context['b'], context['0'], context['ah']);
            context['y2'] = Formula['+-'](context['vc'], context['0'], context['dy1']);
            context['y7'] = Formula['+-'](context['vc'], context['dy1'], context['0']);
            context['y3'] = Formula['+-'](context['vc'], context['0'], context['dx2']);
            context['y6'] = Formula['+-'](context['vc'], context['dx2'], context['0']);
            context['y4'] = Formula['+-'](context['vc'], context['0'], context['dx3']);
            context['y5'] = Formula['+-'](context['vc'], context['dx3'], context['0']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['vc'])} ${lineTo(
                            context,
                            context['ah'],
                            context['y3']
                        )} ${lineTo(context, context['ah'], context['y4'])} ${lineTo(
                            context,
                            context['x2'],
                            context['y4']
                        )} ${lineTo(context, context['x2'], context['y2'])} ${lineTo(
                            context,
                            context['x4'],
                            context['y2']
                        )} ${lineTo(context, context['x4'], context['ah'])} ${lineTo(
                            context,
                            context['x3'],
                            context['ah']
                        )} ${lineTo(context, context['hc'], context['t'])} ${lineTo(
                            context,
                            context['x6'],
                            context['ah']
                        )} ${lineTo(context, context['x5'], context['ah'])} ${lineTo(
                            context,
                            context['x5'],
                            context['y2']
                        )} ${lineTo(context, context['x7'], context['y2'])} ${lineTo(
                            context,
                            context['x7'],
                            context['y4']
                        )} ${lineTo(context, context['x8'], context['y4'])} ${lineTo(
                            context,
                            context['x8'],
                            context['y3']
                        )} ${lineTo(context, context['r'], context['vc'])} ${lineTo(
                            context,
                            context['x8'],
                            context['y6']
                        )} ${lineTo(context, context['x8'], context['y5'])} ${lineTo(
                            context,
                            context['x7'],
                            context['y5']
                        )} ${lineTo(context, context['x7'], context['y7'])} ${lineTo(
                            context,
                            context['x5'],
                            context['y7']
                        )} ${lineTo(context, context['x5'], context['y8'])} ${lineTo(
                            context,
                            context['x6'],
                            context['y8']
                        )} ${lineTo(context, context['hc'], context['b'])} ${lineTo(
                            context,
                            context['x3'],
                            context['y8']
                        )} ${lineTo(context, context['x4'], context['y8'])} ${lineTo(
                            context,
                            context['x4'],
                            context['y7']
                        )} ${lineTo(context, context['x2'], context['y7'])} ${lineTo(
                            context,
                            context['x2'],
                            context['y5']
                        )} ${lineTo(context, context['ah'], context['y5'])} ${lineTo(
                            context,
                            context['ah'],
                            context['y6']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.RECT]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['b'])} ${lineTo(
                            context,
                            context['l'],
                            context['b']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.RIBBON]: {
        editable: true,
        defaultValue: [16667, 50000],
        defaultKey: ['adj1', 'adj2'],
        formula: (width: number, height: number, [adj1, adj2]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;

            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['33333']);
            context['a2'] = Formula['pin'](context['25000'], context['adj2'], context['75000']);
            context['x10'] = Formula['+-'](context['r'], context['0'], context['wd8']);
            context['dx2'] = Formula['*/'](context['w'], context['a2'], context['200000']);
            context['x2'] = Formula['+-'](context['hc'], context['0'], context['dx2']);
            context['x9'] = Formula['+-'](context['hc'], context['dx2'], context['0']);
            context['x3'] = Formula['+-'](context['x2'], context['wd32'], context['0']);
            context['x8'] = Formula['+-'](context['x9'], context['0'], context['wd32']);
            context['x5'] = Formula['+-'](context['x2'], context['wd8'], context['0']);
            context['x6'] = Formula['+-'](context['x9'], context['0'], context['wd8']);
            context['x4'] = Formula['+-'](context['x5'], context['0'], context['wd32']);
            context['x7'] = Formula['+-'](context['x6'], context['wd32'], context['0']);
            context['y1'] = Formula['*/'](context['h'], context['a1'], context['200000']);
            context['y2'] = Formula['*/'](context['h'], context['a1'], context['100000']);
            context['y4'] = Formula['+-'](context['b'], context['0'], context['y2']);
            context['y3'] = Formula['*/'](context['y4'], context['1'], context['2']);
            context['hR'] = Formula['*/'](context['h'], context['a1'], context['400000']);
            context['y5'] = Formula['+-'](context['b'], context['0'], context['hR']);
            context['y6'] = Formula['+-'](context['y2'], context['0'], context['hR']);

            return [
                {
                    d: path(context, { stroke: 'false', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['x4'],
                            context['t']
                        )} ${arcTo(
                            context,
                            context['wd32'],
                            context['hR'],
                            context['3cd4'],
                            context['cd2']
                        )} ${lineTo(context, context['x3'], context['y1'])} ${arcTo(
                            context,
                            context['wd32'],
                            context['hR'],
                            context['3cd4'],
                            context['-10800000']
                        )} ${lineTo(context, context['x8'], context['y2'])} ${arcTo(
                            context,
                            context['wd32'],
                            context['hR'],
                            context['cd4'],
                            context['-10800000']
                        )} ${lineTo(context, context['x7'], context['y1'])} ${arcTo(
                            context,
                            context['wd32'],
                            context['hR'],
                            context['cd4'],
                            context['cd2']
                        )} ${lineTo(context, context['r'], context['t'])} ${lineTo(
                            context,
                            context['x10'],
                            context['y3']
                        )} ${lineTo(context, context['r'], context['y4'])} ${lineTo(
                            context,
                            context['x9'],
                            context['y4']
                        )} ${lineTo(context, context['x9'], context['y5'])} ${arcTo(
                            context,
                            context['wd32'],
                            context['hR'],
                            context['0'],
                            context['cd4']
                        )} ${lineTo(context, context['x3'], context['b'])} ${arcTo(
                            context,
                            context['wd32'],
                            context['hR'],
                            context['cd4'],
                            context['cd4']
                        )} ${lineTo(context, context['x2'], context['y4'])} ${lineTo(
                            context,
                            context['l'],
                            context['y4']
                        )} ${lineTo(context, context['wd8'], context['y3'])} ${close(context)}`;
                    }),
                    attrs: { stroke: 'false', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(
                        context,
                        { stroke: 'false', fill: 'darkenLess', extrusionOk: 'false' },
                        () => {
                            return `${moveTo(context, context['x5'], context['hR'])} ${arcTo(
                                context,
                                context['wd32'],
                                context['hR'],
                                context['0'],
                                context['cd4']
                            )} ${lineTo(context, context['x3'], context['y1'])} ${arcTo(
                                context,
                                context['wd32'],
                                context['hR'],
                                context['3cd4'],
                                context['-10800000']
                            )} ${lineTo(context, context['x5'], context['y2'])} ${close(
                                context
                            )} ${moveTo(context, context['x6'], context['hR'])} ${arcTo(
                                context,
                                context['wd32'],
                                context['hR'],
                                context['cd2'],
                                context['-5400000']
                            )} ${lineTo(context, context['x8'], context['y1'])} ${arcTo(
                                context,
                                context['wd32'],
                                context['hR'],
                                context['3cd4'],
                                context['cd2']
                            )} ${lineTo(context, context['x6'], context['y2'])} ${close(context)}`;
                        }
                    ),
                    attrs: { stroke: 'false', fill: 'darkenLess', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['x4'],
                            context['t']
                        )} ${arcTo(
                            context,
                            context['wd32'],
                            context['hR'],
                            context['3cd4'],
                            context['cd2']
                        )} ${lineTo(context, context['x3'], context['y1'])} ${arcTo(
                            context,
                            context['wd32'],
                            context['hR'],
                            context['3cd4'],
                            context['-10800000']
                        )} ${lineTo(context, context['x8'], context['y2'])} ${arcTo(
                            context,
                            context['wd32'],
                            context['hR'],
                            context['cd4'],
                            context['-10800000']
                        )} ${lineTo(context, context['x7'], context['y1'])} ${arcTo(
                            context,
                            context['wd32'],
                            context['hR'],
                            context['cd4'],
                            context['cd2']
                        )} ${lineTo(context, context['r'], context['t'])} ${lineTo(
                            context,
                            context['x10'],
                            context['y3']
                        )} ${lineTo(context, context['r'], context['y4'])} ${lineTo(
                            context,
                            context['x9'],
                            context['y4']
                        )} ${lineTo(context, context['x9'], context['y5'])} ${arcTo(
                            context,
                            context['wd32'],
                            context['hR'],
                            context['0'],
                            context['cd4']
                        )} ${lineTo(context, context['x3'], context['b'])} ${arcTo(
                            context,
                            context['wd32'],
                            context['hR'],
                            context['cd4'],
                            context['cd4']
                        )} ${lineTo(context, context['x2'], context['y4'])} ${lineTo(
                            context,
                            context['l'],
                            context['y4']
                        )} ${lineTo(context, context['wd8'], context['y3'])} ${close(
                            context
                        )} ${moveTo(context, context['x5'], context['hR'])} ${lineTo(
                            context,
                            context['x5'],
                            context['y2']
                        )} ${moveTo(context, context['x6'], context['y2'])} ${lineTo(
                            context,
                            context['x6'],
                            context['hR']
                        )} ${moveTo(context, context['x2'], context['y4'])} ${lineTo(
                            context,
                            context['x2'],
                            context['y6']
                        )} ${moveTo(context, context['x9'], context['y6'])} ${lineTo(
                            context,
                            context['x9'],
                            context['y4']
                        )}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.RIBBON2]: {
        editable: true,
        defaultValue: [16667, 50000],
        defaultKey: ['adj1', 'adj2'],
        formula: (width: number, height: number, [adj1, adj2]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;

            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['33333']);
            context['a2'] = Formula['pin'](context['25000'], context['adj2'], context['75000']);
            context['x10'] = Formula['+-'](context['r'], context['0'], context['wd8']);
            context['dx2'] = Formula['*/'](context['w'], context['a2'], context['200000']);
            context['x2'] = Formula['+-'](context['hc'], context['0'], context['dx2']);
            context['x9'] = Formula['+-'](context['hc'], context['dx2'], context['0']);
            context['x3'] = Formula['+-'](context['x2'], context['wd32'], context['0']);
            context['x8'] = Formula['+-'](context['x9'], context['0'], context['wd32']);
            context['x5'] = Formula['+-'](context['x2'], context['wd8'], context['0']);
            context['x6'] = Formula['+-'](context['x9'], context['0'], context['wd8']);
            context['x4'] = Formula['+-'](context['x5'], context['0'], context['wd32']);
            context['x7'] = Formula['+-'](context['x6'], context['wd32'], context['0']);
            context['dy1'] = Formula['*/'](context['h'], context['a1'], context['200000']);
            context['y1'] = Formula['+-'](context['b'], context['0'], context['dy1']);
            context['dy2'] = Formula['*/'](context['h'], context['a1'], context['100000']);
            context['y2'] = Formula['+-'](context['b'], context['0'], context['dy2']);
            context['y4'] = Formula['+-'](context['t'], context['dy2'], context['0']);
            context['y3'] = Formula['+/'](context['y4'], context['b'], context['2']);
            context['hR'] = Formula['*/'](context['h'], context['a1'], context['400000']);
            context['y6'] = Formula['+-'](context['b'], context['0'], context['hR']);
            context['y7'] = Formula['+-'](context['y1'], context['0'], context['hR']);

            return [
                {
                    d: path(context, { stroke: 'false', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['l'], context['b'])} ${lineTo(
                            context,
                            context['x4'],
                            context['b']
                        )} ${arcTo(
                            context,
                            context['wd32'],
                            context['hR'],
                            context['cd4'],
                            context['-10800000']
                        )} ${lineTo(context, context['x3'], context['y1'])} ${arcTo(
                            context,
                            context['wd32'],
                            context['hR'],
                            context['cd4'],
                            context['cd2']
                        )} ${lineTo(context, context['x8'], context['y2'])} ${arcTo(
                            context,
                            context['wd32'],
                            context['hR'],
                            context['3cd4'],
                            context['cd2']
                        )} ${lineTo(context, context['x7'], context['y1'])} ${arcTo(
                            context,
                            context['wd32'],
                            context['hR'],
                            context['3cd4'],
                            context['-10800000']
                        )} ${lineTo(context, context['r'], context['b'])} ${lineTo(
                            context,
                            context['x10'],
                            context['y3']
                        )} ${lineTo(context, context['r'], context['y4'])} ${lineTo(
                            context,
                            context['x9'],
                            context['y4']
                        )} ${lineTo(context, context['x9'], context['hR'])} ${arcTo(
                            context,
                            context['wd32'],
                            context['hR'],
                            context['0'],
                            context['-5400000']
                        )} ${lineTo(context, context['x3'], context['t'])} ${arcTo(
                            context,
                            context['wd32'],
                            context['hR'],
                            context['3cd4'],
                            context['-5400000']
                        )} ${lineTo(context, context['x2'], context['y4'])} ${lineTo(
                            context,
                            context['l'],
                            context['y4']
                        )} ${lineTo(context, context['wd8'], context['y3'])} ${close(context)}`;
                    }),
                    attrs: { stroke: 'false', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(
                        context,
                        { stroke: 'false', fill: 'darkenLess', extrusionOk: 'false' },
                        () => {
                            return `${moveTo(context, context['x5'], context['y6'])} ${arcTo(
                                context,
                                context['wd32'],
                                context['hR'],
                                context['0'],
                                context['-5400000']
                            )} ${lineTo(context, context['x3'], context['y1'])} ${arcTo(
                                context,
                                context['wd32'],
                                context['hR'],
                                context['cd4'],
                                context['cd2']
                            )} ${lineTo(context, context['x5'], context['y2'])} ${close(
                                context
                            )} ${moveTo(context, context['x6'], context['y6'])} ${arcTo(
                                context,
                                context['wd32'],
                                context['hR'],
                                context['cd2'],
                                context['cd4']
                            )} ${lineTo(context, context['x8'], context['y1'])} ${arcTo(
                                context,
                                context['wd32'],
                                context['hR'],
                                context['cd4'],
                                context['-10800000']
                            )} ${lineTo(context, context['x6'], context['y2'])} ${close(context)}`;
                        }
                    ),
                    attrs: { stroke: 'false', fill: 'darkenLess', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['l'], context['b'])} ${lineTo(
                            context,
                            context['wd8'],
                            context['y3']
                        )} ${lineTo(context, context['l'], context['y4'])} ${lineTo(
                            context,
                            context['x2'],
                            context['y4']
                        )} ${lineTo(context, context['x2'], context['hR'])} ${arcTo(
                            context,
                            context['wd32'],
                            context['hR'],
                            context['cd2'],
                            context['cd4']
                        )} ${lineTo(context, context['x8'], context['t'])} ${arcTo(
                            context,
                            context['wd32'],
                            context['hR'],
                            context['3cd4'],
                            context['cd4']
                        )} ${lineTo(context, context['x9'], context['y4'])} ${lineTo(
                            context,
                            context['x9'],
                            context['y4']
                        )} ${lineTo(context, context['r'], context['y4'])} ${lineTo(
                            context,
                            context['x10'],
                            context['y3']
                        )} ${lineTo(context, context['r'], context['b'])} ${lineTo(
                            context,
                            context['x7'],
                            context['b']
                        )} ${arcTo(
                            context,
                            context['wd32'],
                            context['hR'],
                            context['cd4'],
                            context['cd2']
                        )} ${lineTo(context, context['x8'], context['y1'])} ${arcTo(
                            context,
                            context['wd32'],
                            context['hR'],
                            context['cd4'],
                            context['-10800000']
                        )} ${lineTo(context, context['x3'], context['y2'])} ${arcTo(
                            context,
                            context['wd32'],
                            context['hR'],
                            context['3cd4'],
                            context['-10800000']
                        )} ${lineTo(context, context['x4'], context['y1'])} ${arcTo(
                            context,
                            context['wd32'],
                            context['hR'],
                            context['3cd4'],
                            context['cd2']
                        )} ${close(context)} ${moveTo(
                            context,
                            context['x5'],
                            context['y2']
                        )} ${lineTo(context, context['x5'], context['y6'])} ${moveTo(
                            context,
                            context['x6'],
                            context['y6']
                        )} ${lineTo(context, context['x6'], context['y2'])} ${moveTo(
                            context,
                            context['x2'],
                            context['y7']
                        )} ${lineTo(context, context['x2'], context['y4'])} ${moveTo(
                            context,
                            context['x9'],
                            context['y4']
                        )} ${lineTo(context, context['x9'], context['y7'])}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.RIGHT_ARROW]: {
        editable: true,
        defaultValue: [50000, 50000],
        defaultKey: ['adj1', 'adj2'],
        formula: (width: number, height: number, [adj1, adj2]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;

            context['maxAdj2'] = Formula['*/'](context['100000'], context['w'], context['ss']);
            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['100000']);
            context['a2'] = Formula['pin'](context['0'], context['adj2'], context['maxAdj2']);
            context['dx1'] = Formula['*/'](context['ss'], context['a2'], context['100000']);
            context['x1'] = Formula['+-'](context['r'], context['0'], context['dx1']);
            context['dy1'] = Formula['*/'](context['h'], context['a1'], context['200000']);
            context['y1'] = Formula['+-'](context['vc'], context['0'], context['dy1']);
            context['y2'] = Formula['+-'](context['vc'], context['dy1'], context['0']);
            context['dx2'] = Formula['*/'](context['y1'], context['dx1'], context['hd2']);
            context['x2'] = Formula['+-'](context['x1'], context['dx2'], context['0']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['y1'])} ${lineTo(
                            context,
                            context['x1'],
                            context['y1']
                        )} ${lineTo(context, context['x1'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['vc']
                        )} ${lineTo(context, context['x1'], context['b'])} ${lineTo(
                            context,
                            context['x1'],
                            context['y2']
                        )} ${lineTo(context, context['l'], context['y2'])} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.RIGHT_ARROW_CALLOUT]: {
        editable: true,
        defaultValue: [25000, 25000, 25000, 64977],
        defaultKey: ['adj1', 'adj2', 'adj3', 'adj4'],
        formula: (width: number, height: number, [adj1, adj2, adj3, adj4]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;
            context['adj3'] = adj3;
            context['adj4'] = adj4;

            context['maxAdj2'] = Formula['*/'](context['50000'], context['h'], context['ss']);
            context['a2'] = Formula['pin'](context['0'], context['adj2'], context['maxAdj2']);
            context['maxAdj1'] = Formula['*/'](context['a2'], context['2'], context['1']);
            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['maxAdj1']);
            context['maxAdj3'] = Formula['*/'](context['100000'], context['w'], context['ss']);
            context['a3'] = Formula['pin'](context['0'], context['adj3'], context['maxAdj3']);
            context['q2'] = Formula['*/'](context['a3'], context['ss'], context['w']);
            context['maxAdj4'] = Formula['+-'](context['100000'], context['0'], context['q2']);
            context['a4'] = Formula['pin'](context['0'], context['adj4'], context['maxAdj4']);
            context['dy1'] = Formula['*/'](context['ss'], context['a2'], context['100000']);
            context['dy2'] = Formula['*/'](context['ss'], context['a1'], context['200000']);
            context['y1'] = Formula['+-'](context['vc'], context['0'], context['dy1']);
            context['y2'] = Formula['+-'](context['vc'], context['0'], context['dy2']);
            context['y3'] = Formula['+-'](context['vc'], context['dy2'], context['0']);
            context['y4'] = Formula['+-'](context['vc'], context['dy1'], context['0']);
            context['dx3'] = Formula['*/'](context['ss'], context['a3'], context['100000']);
            context['x3'] = Formula['+-'](context['r'], context['0'], context['dx3']);
            context['x2'] = Formula['*/'](context['w'], context['a4'], context['100000']);
            context['x1'] = Formula['*/'](context['x2'], context['1'], context['2']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['x2'],
                            context['t']
                        )} ${lineTo(context, context['x2'], context['y2'])} ${lineTo(
                            context,
                            context['x3'],
                            context['y2']
                        )} ${lineTo(context, context['x3'], context['y1'])} ${lineTo(
                            context,
                            context['r'],
                            context['vc']
                        )} ${lineTo(context, context['x3'], context['y4'])} ${lineTo(
                            context,
                            context['x3'],
                            context['y3']
                        )} ${lineTo(context, context['x2'], context['y3'])} ${lineTo(
                            context,
                            context['x2'],
                            context['b']
                        )} ${lineTo(context, context['l'], context['b'])} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.RIGHT_BRACE]: {
        editable: true,
        defaultValue: [8333, 50000],
        defaultKey: ['adj1', 'adj2'],
        formula: (width: number, height: number, [adj1, adj2]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;

            context['a2'] = Formula['pin'](context['0'], context['adj2'], context['100000']);
            context['q1'] = Formula['+-'](context['100000'], context['0'], context['a2']);
            context['q2'] = Formula['min'](context['q1'], context['a2']);
            context['q3'] = Formula['*/'](context['q2'], context['1'], context['2']);
            context['maxAdj1'] = Formula['*/'](context['q3'], context['h'], context['ss']);
            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['maxAdj1']);
            context['y1'] = Formula['*/'](context['ss'], context['a1'], context['100000']);
            context['y3'] = Formula['*/'](context['h'], context['a2'], context['100000']);
            context['y2'] = Formula['+-'](context['y3'], context['0'], context['y1']);
            context['y4'] = Formula['+-'](context['b'], context['0'], context['y1']);
            context['dx1'] = Formula['cos'](context['wd2'], context['2700000']);
            context['dy1'] = Formula['sin'](context['y1'], context['2700000']);
            context['ir'] = Formula['+-'](context['l'], context['dx1'], context['0']);
            context['it'] = Formula['+-'](context['y1'], context['0'], context['dy1']);
            context['ib'] = Formula['+-'](context['b'], context['dy1'], context['y1']);

            return [
                {
                    d: path(context, { stroke: 'false', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${arcTo(
                            context,
                            context['wd2'],
                            context['y1'],
                            context['3cd4'],
                            context['cd4']
                        )} ${lineTo(context, context['hc'], context['y2'])} ${arcTo(
                            context,
                            context['wd2'],
                            context['y1'],
                            context['cd2'],
                            context['-5400000']
                        )} ${arcTo(
                            context,
                            context['wd2'],
                            context['y1'],
                            context['3cd4'],
                            context['-5400000']
                        )} ${lineTo(context, context['hc'], context['y4'])} ${arcTo(
                            context,
                            context['wd2'],
                            context['y1'],
                            context['0'],
                            context['cd4']
                        )} ${close(context)}`;
                    }),
                    attrs: { stroke: 'false', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${arcTo(
                            context,
                            context['wd2'],
                            context['y1'],
                            context['3cd4'],
                            context['cd4']
                        )} ${lineTo(context, context['hc'], context['y2'])} ${arcTo(
                            context,
                            context['wd2'],
                            context['y1'],
                            context['cd2'],
                            context['-5400000']
                        )} ${arcTo(
                            context,
                            context['wd2'],
                            context['y1'],
                            context['3cd4'],
                            context['-5400000']
                        )} ${lineTo(context, context['hc'], context['y4'])} ${arcTo(
                            context,
                            context['wd2'],
                            context['y1'],
                            context['0'],
                            context['cd4']
                        )}`;
                    }),
                    attrs: { fill: 'none' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.RIGHT_BRACKET]: {
        editable: true,
        defaultValue: [8333],
        defaultKey: ['adj'],
        formula: (width: number, height: number, [adj]: number[]) => {
            const context = getContext(width, height);
            context['adj'] = adj;

            context['maxAdj'] = Formula['*/'](context['50000'], context['h'], context['ss']);
            context['a'] = Formula['pin'](context['0'], context['adj'], context['maxAdj']);
            context['y1'] = Formula['*/'](context['ss'], context['a'], context['100000']);
            context['y2'] = Formula['+-'](context['b'], context['0'], context['y1']);
            context['dx1'] = Formula['cos'](context['w'], context['2700000']);
            context['dy1'] = Formula['sin'](context['y1'], context['2700000']);
            context['ir'] = Formula['+-'](context['l'], context['dx1'], context['0']);
            context['it'] = Formula['+-'](context['y1'], context['0'], context['dy1']);
            context['ib'] = Formula['+-'](context['b'], context['dy1'], context['y1']);

            return [
                {
                    d: path(context, { stroke: 'false', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${arcTo(
                            context,
                            context['w'],
                            context['y1'],
                            context['3cd4'],
                            context['cd4']
                        )} ${lineTo(context, context['r'], context['y2'])} ${arcTo(
                            context,
                            context['w'],
                            context['y1'],
                            context['0'],
                            context['cd4']
                        )} ${close(context)}`;
                    }),
                    attrs: { stroke: 'false', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${arcTo(
                            context,
                            context['w'],
                            context['y1'],
                            context['3cd4'],
                            context['cd4']
                        )} ${lineTo(context, context['r'], context['y2'])} ${arcTo(
                            context,
                            context['w'],
                            context['y1'],
                            context['0'],
                            context['cd4']
                        )}`;
                    }),
                    attrs: { fill: 'none' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.ROUND1_RECT]: {
        editable: true,
        defaultValue: [16667],
        defaultKey: ['adj'],
        formula: (width: number, height: number, [adj]: number[]) => {
            const context = getContext(width, height);
            context['adj'] = adj;

            context['a'] = Formula['pin'](context['0'], context['adj'], context['50000']);
            context['dx1'] = Formula['*/'](context['ss'], context['a'], context['100000']);
            context['x1'] = Formula['+-'](context['r'], context['0'], context['dx1']);
            context['idx'] = Formula['*/'](context['dx1'], context['29289'], context['100000']);
            context['ir'] = Formula['+-'](context['r'], context['0'], context['idx']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['x1'],
                            context['t']
                        )} ${arcTo(
                            context,
                            context['dx1'],
                            context['dx1'],
                            context['3cd4'],
                            context['cd4']
                        )} ${lineTo(context, context['r'], context['b'])} ${lineTo(
                            context,
                            context['l'],
                            context['b']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.ROUND2_DIAG_RECT]: {
        editable: true,
        defaultValue: [16667, 0],
        defaultKey: ['adj1', 'adj2'],
        formula: (width: number, height: number, [adj1, adj2]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;

            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['50000']);
            context['a2'] = Formula['pin'](context['0'], context['adj2'], context['50000']);
            context['x1'] = Formula['*/'](context['ss'], context['a1'], context['100000']);
            context['y1'] = Formula['+-'](context['b'], context['0'], context['x1']);
            context['a'] = Formula['*/'](context['ss'], context['a2'], context['100000']);
            context['x2'] = Formula['+-'](context['r'], context['0'], context['a']);
            context['y2'] = Formula['+-'](context['b'], context['0'], context['a']);
            context['dx1'] = Formula['*/'](context['x1'], context['29289'], context['100000']);
            context['dx2'] = Formula['*/'](context['a'], context['29289'], context['100000']);
            context['d'] = Formula['+-'](context['dx1'], context['0'], context['dx2']);
            context['dx'] = Formula['?:'](context['d'], context['dx1'], context['dx2']);
            context['ir'] = Formula['+-'](context['r'], context['0'], context['dx']);
            context['ib'] = Formula['+-'](context['b'], context['0'], context['dx']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['x1'], context['t'])} ${lineTo(
                            context,
                            context['x2'],
                            context['t']
                        )} ${arcTo(
                            context,
                            context['a'],
                            context['a'],
                            context['3cd4'],
                            context['cd4']
                        )} ${lineTo(context, context['r'], context['y1'])} ${arcTo(
                            context,
                            context['x1'],
                            context['x1'],
                            context['0'],
                            context['cd4']
                        )} ${lineTo(context, context['a'], context['b'])} ${arcTo(
                            context,
                            context['a'],
                            context['a'],
                            context['cd4'],
                            context['cd4']
                        )} ${lineTo(context, context['l'], context['x1'])} ${arcTo(
                            context,
                            context['x1'],
                            context['x1'],
                            context['cd2'],
                            context['cd4']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.ROUND2_SAME_RECT]: {
        editable: true,
        defaultValue: [16667, 0],
        defaultKey: ['adj1', 'adj2'],
        formula: (width: number, height: number, [adj1, adj2]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;

            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['50000']);
            context['a2'] = Formula['pin'](context['0'], context['adj2'], context['50000']);
            context['tx1'] = Formula['*/'](context['ss'], context['a1'], context['100000']);
            context['tx2'] = Formula['+-'](context['r'], context['0'], context['tx1']);
            context['bx1'] = Formula['*/'](context['ss'], context['a2'], context['100000']);
            context['bx2'] = Formula['+-'](context['r'], context['0'], context['bx1']);
            context['by1'] = Formula['+-'](context['b'], context['0'], context['bx1']);
            context['d'] = Formula['+-'](context['tx1'], context['0'], context['bx1']);
            context['tdx'] = Formula['*/'](context['tx1'], context['29289'], context['100000']);
            context['bdx'] = Formula['*/'](context['bx1'], context['29289'], context['100000']);
            context['il'] = Formula['?:'](context['d'], context['tdx'], context['bdx']);
            context['ir'] = Formula['+-'](context['r'], context['0'], context['il']);
            context['ib'] = Formula['+-'](context['b'], context['0'], context['bdx']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['tx1'], context['t'])} ${lineTo(
                            context,
                            context['tx2'],
                            context['t']
                        )} ${arcTo(
                            context,
                            context['tx1'],
                            context['tx1'],
                            context['3cd4'],
                            context['cd4']
                        )} ${lineTo(context, context['r'], context['by1'])} ${arcTo(
                            context,
                            context['bx1'],
                            context['bx1'],
                            context['0'],
                            context['cd4']
                        )} ${lineTo(context, context['bx1'], context['b'])} ${arcTo(
                            context,
                            context['bx1'],
                            context['bx1'],
                            context['cd4'],
                            context['cd4']
                        )} ${lineTo(context, context['l'], context['tx1'])} ${arcTo(
                            context,
                            context['tx1'],
                            context['tx1'],
                            context['cd2'],
                            context['cd4']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.ROUND_RECT]: {
        editable: true,
        defaultValue: [16667],
        defaultKey: ['adj'],
        formula: (width: number, height: number, [adj]: number[]) => {
            const context = getContext(width, height);
            context['adj'] = adj;

            context['a'] = Formula['pin'](context['0'], context['adj'], context['50000']);
            context['x1'] = Formula['*/'](context['ss'], context['a'], context['100000']);
            context['x2'] = Formula['+-'](context['r'], context['0'], context['x1']);
            context['y2'] = Formula['+-'](context['b'], context['0'], context['x1']);
            context['il'] = Formula['*/'](context['x1'], context['29289'], context['100000']);
            context['ir'] = Formula['+-'](context['r'], context['0'], context['il']);
            context['ib'] = Formula['+-'](context['b'], context['0'], context['il']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['x1'])} ${arcTo(
                            context,
                            context['x1'],
                            context['x1'],
                            context['cd2'],
                            context['cd4']
                        )} ${lineTo(context, context['x2'], context['t'])} ${arcTo(
                            context,
                            context['x1'],
                            context['x1'],
                            context['3cd4'],
                            context['cd4']
                        )} ${lineTo(context, context['r'], context['y2'])} ${arcTo(
                            context,
                            context['x1'],
                            context['x1'],
                            context['0'],
                            context['cd4']
                        )} ${lineTo(context, context['x1'], context['b'])} ${arcTo(
                            context,
                            context['x1'],
                            context['x1'],
                            context['cd4'],
                            context['cd4']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.RT_TRIANGLE]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            context['it'] = Formula['*/'](context['h'], context['7'], context['12']);
            context['ir'] = Formula['*/'](context['w'], context['7'], context['12']);
            context['ib'] = Formula['*/'](context['h'], context['11'], context['12']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['b'])} ${lineTo(
                            context,
                            context['l'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['b'])} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.SMILEY_FACE]: {
        editable: true,
        defaultValue: [4653],
        defaultKey: ['adj'],
        formula: (width: number, height: number, [adj]: number[]) => {
            const context = getContext(width, height);
            context['adj'] = adj;

            context['a'] = Formula['pin'](context['-4653'], context['adj'], context['4653']);
            context['x1'] = Formula['*/'](context['w'], context['4969'], context['21699']);
            context['x2'] = Formula['*/'](context['w'], context['6215'], context['21600']);
            context['x3'] = Formula['*/'](context['w'], context['13135'], context['21600']);
            context['x4'] = Formula['*/'](context['w'], context['16640'], context['21600']);
            context['y1'] = Formula['*/'](context['h'], context['7570'], context['21600']);
            context['y3'] = Formula['*/'](context['h'], context['16515'], context['21600']);
            context['dy2'] = Formula['*/'](context['h'], context['a'], context['100000']);
            context['y2'] = Formula['+-'](context['y3'], context['0'], context['dy2']);
            context['y4'] = Formula['+-'](context['y3'], context['dy2'], context['0']);
            context['dy3'] = Formula['*/'](context['h'], context['a'], context['50000']);
            context['y5'] = Formula['+-'](context['y4'], context['dy3'], context['0']);
            context['idx'] = Formula['cos'](context['wd2'], context['2700000']);
            context['idy'] = Formula['sin'](context['hd2'], context['2700000']);
            context['il'] = Formula['+-'](context['hc'], context['0'], context['idx']);
            context['ir'] = Formula['+-'](context['hc'], context['idx'], context['0']);
            context['it'] = Formula['+-'](context['vc'], context['0'], context['idy']);
            context['ib'] = Formula['+-'](context['vc'], context['idy'], context['0']);
            context['wR'] = Formula['*/'](context['w'], context['1125'], context['21600']);
            context['hR'] = Formula['*/'](context['h'], context['1125'], context['21600']);

            return [
                {
                    d: path(context, { stroke: 'false', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['l'], context['vc'])} ${arcTo(
                            context,
                            context['wd2'],
                            context['hd2'],
                            context['cd2'],
                            context['21600000']
                        )} ${close(context)}`;
                    }),
                    attrs: { stroke: 'false', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'darkenLess', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['x2'], context['y1'])} ${arcTo(
                            context,
                            context['wR'],
                            context['hR'],
                            context['cd2'],
                            context['21600000']
                        )} ${moveTo(context, context['x3'], context['y1'])} ${arcTo(
                            context,
                            context['wR'],
                            context['hR'],
                            context['cd2'],
                            context['21600000']
                        )}`;
                    }),
                    attrs: { fill: 'darkenLess', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['x1'], context['y2'])} ${quadBezTo(
                            context,
                            context['hc'],
                            context['y5'],
                            context['x4'],
                            context['y2']
                        )}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none' }, () => {
                        return `${moveTo(context, context['l'], context['vc'])} ${arcTo(
                            context,
                            context['wd2'],
                            context['hd2'],
                            context['cd2'],
                            context['21600000']
                        )} ${close(context)}`;
                    }),
                    attrs: { fill: 'none' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.SNIP1_RECT]: {
        editable: true,
        defaultValue: [16667],
        defaultKey: ['adj'],
        formula: (width: number, height: number, [adj]: number[]) => {
            const context = getContext(width, height);
            context['adj'] = adj;

            context['a'] = Formula['pin'](context['0'], context['adj'], context['50000']);
            context['dx1'] = Formula['*/'](context['ss'], context['a'], context['100000']);
            context['x1'] = Formula['+-'](context['r'], context['0'], context['dx1']);
            context['it'] = Formula['*/'](context['dx1'], context['1'], context['2']);
            context['ir'] = Formula['+/'](context['x1'], context['r'], context['2']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['x1'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['dx1'])} ${lineTo(
                            context,
                            context['r'],
                            context['b']
                        )} ${lineTo(context, context['l'], context['b'])} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.SNIP2_DIAG_RECT]: {
        editable: true,
        defaultValue: [0, 16667],
        defaultKey: ['adj1', 'adj2'],
        formula: (width: number, height: number, [adj1, adj2]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;

            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['50000']);
            context['a2'] = Formula['pin'](context['0'], context['adj2'], context['50000']);
            context['lx1'] = Formula['*/'](context['ss'], context['a1'], context['100000']);
            context['lx2'] = Formula['+-'](context['r'], context['0'], context['lx1']);
            context['ly1'] = Formula['+-'](context['b'], context['0'], context['lx1']);
            context['rx1'] = Formula['*/'](context['ss'], context['a2'], context['100000']);
            context['rx2'] = Formula['+-'](context['r'], context['0'], context['rx1']);
            context['ry1'] = Formula['+-'](context['b'], context['0'], context['rx1']);
            context['d'] = Formula['+-'](context['lx1'], context['0'], context['rx1']);
            context['dx'] = Formula['?:'](context['d'], context['lx1'], context['rx1']);
            context['il'] = Formula['*/'](context['dx'], context['1'], context['2']);
            context['ir'] = Formula['+-'](context['r'], context['0'], context['il']);
            context['ib'] = Formula['+-'](context['b'], context['0'], context['il']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['lx1'], context['t'])} ${lineTo(
                            context,
                            context['rx2'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['rx1'])} ${lineTo(
                            context,
                            context['r'],
                            context['ly1']
                        )} ${lineTo(context, context['lx2'], context['b'])} ${lineTo(
                            context,
                            context['rx1'],
                            context['b']
                        )} ${lineTo(context, context['l'], context['ry1'])} ${lineTo(
                            context,
                            context['l'],
                            context['lx1']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.SNIP2_SAME_RECT]: {
        editable: true,
        defaultValue: [16667, 0],
        defaultKey: ['adj1', 'adj2'],
        formula: (width: number, height: number, [adj1, adj2]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;

            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['50000']);
            context['a2'] = Formula['pin'](context['0'], context['adj2'], context['50000']);
            context['tx1'] = Formula['*/'](context['ss'], context['a1'], context['100000']);
            context['tx2'] = Formula['+-'](context['r'], context['0'], context['tx1']);
            context['bx1'] = Formula['*/'](context['ss'], context['a2'], context['100000']);
            context['bx2'] = Formula['+-'](context['r'], context['0'], context['bx1']);
            context['by1'] = Formula['+-'](context['b'], context['0'], context['bx1']);
            context['d'] = Formula['+-'](context['tx1'], context['0'], context['bx1']);
            context['dx'] = Formula['?:'](context['d'], context['tx1'], context['bx1']);
            context['il'] = Formula['*/'](context['dx'], context['1'], context['2']);
            context['ir'] = Formula['+-'](context['r'], context['0'], context['il']);
            context['it'] = Formula['*/'](context['tx1'], context['1'], context['2']);
            context['ib'] = Formula['+/'](context['by1'], context['b'], context['2']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['tx1'], context['t'])} ${lineTo(
                            context,
                            context['tx2'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['tx1'])} ${lineTo(
                            context,
                            context['r'],
                            context['by1']
                        )} ${lineTo(context, context['bx2'], context['b'])} ${lineTo(
                            context,
                            context['bx1'],
                            context['b']
                        )} ${lineTo(context, context['l'], context['by1'])} ${lineTo(
                            context,
                            context['l'],
                            context['tx1']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.SNIP_ROUND_RECT]: {
        editable: true,
        defaultValue: [16667, 16667],
        defaultKey: ['adj1', 'adj2'],
        formula: (width: number, height: number, [adj1, adj2]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;

            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['50000']);
            context['a2'] = Formula['pin'](context['0'], context['adj2'], context['50000']);
            context['x1'] = Formula['*/'](context['ss'], context['a1'], context['100000']);
            context['dx2'] = Formula['*/'](context['ss'], context['a2'], context['100000']);
            context['x2'] = Formula['+-'](context['r'], context['0'], context['dx2']);
            context['il'] = Formula['*/'](context['x1'], context['29289'], context['100000']);
            context['ir'] = Formula['+/'](context['x2'], context['r'], context['2']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['x1'], context['t'])} ${lineTo(
                            context,
                            context['x2'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['dx2'])} ${lineTo(
                            context,
                            context['r'],
                            context['b']
                        )} ${lineTo(context, context['l'], context['b'])} ${lineTo(
                            context,
                            context['l'],
                            context['x1']
                        )} ${arcTo(
                            context,
                            context['x1'],
                            context['x1'],
                            context['cd2'],
                            context['cd4']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.SQUARE_TABS]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            context['md'] = Formula['mod'](context['w'], context['h'], context['0']);
            context['dx'] = Formula['*/'](context['1'], context['md'], context['20']);
            context['y1'] = Formula['+-'](context['0'], context['b'], context['dx']);
            context['x1'] = Formula['+-'](context['0'], context['r'], context['dx']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['dx'],
                            context['t']
                        )} ${lineTo(context, context['dx'], context['dx'])} ${lineTo(
                            context,
                            context['l'],
                            context['dx']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['y1'])} ${lineTo(
                            context,
                            context['dx'],
                            context['y1']
                        )} ${lineTo(context, context['dx'], context['b'])} ${lineTo(
                            context,
                            context['l'],
                            context['b']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['x1'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['dx'])} ${lineTo(
                            context,
                            context['x1'],
                            context['dx']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['x1'], context['y1'])} ${lineTo(
                            context,
                            context['r'],
                            context['y1']
                        )} ${lineTo(context, context['r'], context['b'])} ${lineTo(
                            context,
                            context['x1'],
                            context['b']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.STAR10]: {
        editable: true,
        defaultValue: [42533, 105146],
        defaultKey: ['adj', 'hf'],
        formula: (width: number, height: number, [adj, hf]: number[]) => {
            const context = getContext(width, height);
            context['adj'] = adj;
            context['hf'] = hf;

            context['a'] = Formula['pin'](context['0'], context['adj'], context['50000']);
            context['swd2'] = Formula['*/'](context['wd2'], context['hf'], context['100000']);
            context['dx1'] = Formula['*/'](context['swd2'], context['95106'], context['100000']);
            context['dx2'] = Formula['*/'](context['swd2'], context['58779'], context['100000']);
            context['x1'] = Formula['+-'](context['hc'], context['0'], context['dx1']);
            context['x2'] = Formula['+-'](context['hc'], context['0'], context['dx2']);
            context['x3'] = Formula['+-'](context['hc'], context['dx2'], context['0']);
            context['x4'] = Formula['+-'](context['hc'], context['dx1'], context['0']);
            context['dy1'] = Formula['*/'](context['hd2'], context['80902'], context['100000']);
            context['dy2'] = Formula['*/'](context['hd2'], context['30902'], context['100000']);
            context['y1'] = Formula['+-'](context['vc'], context['0'], context['dy1']);
            context['y2'] = Formula['+-'](context['vc'], context['0'], context['dy2']);
            context['y3'] = Formula['+-'](context['vc'], context['dy2'], context['0']);
            context['y4'] = Formula['+-'](context['vc'], context['dy1'], context['0']);
            context['iwd2'] = Formula['*/'](context['swd2'], context['a'], context['50000']);
            context['ihd2'] = Formula['*/'](context['hd2'], context['a'], context['50000']);
            context['sdx1'] = Formula['*/'](context['iwd2'], context['80902'], context['100000']);
            context['sdx2'] = Formula['*/'](context['iwd2'], context['30902'], context['100000']);
            context['sdy1'] = Formula['*/'](context['ihd2'], context['95106'], context['100000']);
            context['sdy2'] = Formula['*/'](context['ihd2'], context['58779'], context['100000']);
            context['sx1'] = Formula['+-'](context['hc'], context['0'], context['iwd2']);
            context['sx2'] = Formula['+-'](context['hc'], context['0'], context['sdx1']);
            context['sx3'] = Formula['+-'](context['hc'], context['0'], context['sdx2']);
            context['sx4'] = Formula['+-'](context['hc'], context['sdx2'], context['0']);
            context['sx5'] = Formula['+-'](context['hc'], context['sdx1'], context['0']);
            context['sx6'] = Formula['+-'](context['hc'], context['iwd2'], context['0']);
            context['sy1'] = Formula['+-'](context['vc'], context['0'], context['sdy1']);
            context['sy2'] = Formula['+-'](context['vc'], context['0'], context['sdy2']);
            context['sy3'] = Formula['+-'](context['vc'], context['sdy2'], context['0']);
            context['sy4'] = Formula['+-'](context['vc'], context['sdy1'], context['0']);
            context['yAdj'] = Formula['+-'](context['vc'], context['0'], context['ihd2']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['x1'], context['y2'])} ${lineTo(
                            context,
                            context['sx2'],
                            context['sy2']
                        )} ${lineTo(context, context['x2'], context['y1'])} ${lineTo(
                            context,
                            context['sx3'],
                            context['sy1']
                        )} ${lineTo(context, context['hc'], context['t'])} ${lineTo(
                            context,
                            context['sx4'],
                            context['sy1']
                        )} ${lineTo(context, context['x3'], context['y1'])} ${lineTo(
                            context,
                            context['sx5'],
                            context['sy2']
                        )} ${lineTo(context, context['x4'], context['y2'])} ${lineTo(
                            context,
                            context['sx6'],
                            context['vc']
                        )} ${lineTo(context, context['x4'], context['y3'])} ${lineTo(
                            context,
                            context['sx5'],
                            context['sy3']
                        )} ${lineTo(context, context['x3'], context['y4'])} ${lineTo(
                            context,
                            context['sx4'],
                            context['sy4']
                        )} ${lineTo(context, context['hc'], context['b'])} ${lineTo(
                            context,
                            context['sx3'],
                            context['sy4']
                        )} ${lineTo(context, context['x2'], context['y4'])} ${lineTo(
                            context,
                            context['sx2'],
                            context['sy3']
                        )} ${lineTo(context, context['x1'], context['y3'])} ${lineTo(
                            context,
                            context['sx1'],
                            context['vc']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.STAR12]: {
        editable: true,
        defaultValue: [37500],
        defaultKey: ['adj'],
        formula: (width: number, height: number, [adj]: number[]) => {
            const context = getContext(width, height);
            context['adj'] = adj;

            context['a'] = Formula['pin'](context['0'], context['adj'], context['50000']);
            context['dx1'] = Formula['cos'](context['wd2'], context['1800000']);
            context['dy1'] = Formula['sin'](context['hd2'], context['3600000']);
            context['x1'] = Formula['+-'](context['hc'], context['0'], context['dx1']);
            context['x3'] = Formula['*/'](context['w'], context['3'], context['4']);
            context['x4'] = Formula['+-'](context['hc'], context['dx1'], context['0']);
            context['y1'] = Formula['+-'](context['vc'], context['0'], context['dy1']);
            context['y3'] = Formula['*/'](context['h'], context['3'], context['4']);
            context['y4'] = Formula['+-'](context['vc'], context['dy1'], context['0']);
            context['iwd2'] = Formula['*/'](context['wd2'], context['a'], context['50000']);
            context['ihd2'] = Formula['*/'](context['hd2'], context['a'], context['50000']);
            context['sdx1'] = Formula['cos'](context['iwd2'], context['900000']);
            context['sdx2'] = Formula['cos'](context['iwd2'], context['2700000']);
            context['sdx3'] = Formula['cos'](context['iwd2'], context['4500000']);
            context['sdy1'] = Formula['sin'](context['ihd2'], context['4500000']);
            context['sdy2'] = Formula['sin'](context['ihd2'], context['2700000']);
            context['sdy3'] = Formula['sin'](context['ihd2'], context['900000']);
            context['sx1'] = Formula['+-'](context['hc'], context['0'], context['sdx1']);
            context['sx2'] = Formula['+-'](context['hc'], context['0'], context['sdx2']);
            context['sx3'] = Formula['+-'](context['hc'], context['0'], context['sdx3']);
            context['sx4'] = Formula['+-'](context['hc'], context['sdx3'], context['0']);
            context['sx5'] = Formula['+-'](context['hc'], context['sdx2'], context['0']);
            context['sx6'] = Formula['+-'](context['hc'], context['sdx1'], context['0']);
            context['sy1'] = Formula['+-'](context['vc'], context['0'], context['sdy1']);
            context['sy2'] = Formula['+-'](context['vc'], context['0'], context['sdy2']);
            context['sy3'] = Formula['+-'](context['vc'], context['0'], context['sdy3']);
            context['sy4'] = Formula['+-'](context['vc'], context['sdy3'], context['0']);
            context['sy5'] = Formula['+-'](context['vc'], context['sdy2'], context['0']);
            context['sy6'] = Formula['+-'](context['vc'], context['sdy1'], context['0']);
            context['yAdj'] = Formula['+-'](context['vc'], context['0'], context['ihd2']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['vc'])} ${lineTo(
                            context,
                            context['sx1'],
                            context['sy3']
                        )} ${lineTo(context, context['x1'], context['hd4'])} ${lineTo(
                            context,
                            context['sx2'],
                            context['sy2']
                        )} ${lineTo(context, context['wd4'], context['y1'])} ${lineTo(
                            context,
                            context['sx3'],
                            context['sy1']
                        )} ${lineTo(context, context['hc'], context['t'])} ${lineTo(
                            context,
                            context['sx4'],
                            context['sy1']
                        )} ${lineTo(context, context['x3'], context['y1'])} ${lineTo(
                            context,
                            context['sx5'],
                            context['sy2']
                        )} ${lineTo(context, context['x4'], context['hd4'])} ${lineTo(
                            context,
                            context['sx6'],
                            context['sy3']
                        )} ${lineTo(context, context['r'], context['vc'])} ${lineTo(
                            context,
                            context['sx6'],
                            context['sy4']
                        )} ${lineTo(context, context['x4'], context['y3'])} ${lineTo(
                            context,
                            context['sx5'],
                            context['sy5']
                        )} ${lineTo(context, context['x3'], context['y4'])} ${lineTo(
                            context,
                            context['sx4'],
                            context['sy6']
                        )} ${lineTo(context, context['hc'], context['b'])} ${lineTo(
                            context,
                            context['sx3'],
                            context['sy6']
                        )} ${lineTo(context, context['wd4'], context['y4'])} ${lineTo(
                            context,
                            context['sx2'],
                            context['sy5']
                        )} ${lineTo(context, context['x1'], context['y3'])} ${lineTo(
                            context,
                            context['sx1'],
                            context['sy4']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.STAR16]: {
        editable: true,
        defaultValue: [37500],
        defaultKey: ['adj'],
        formula: (width: number, height: number, [adj]: number[]) => {
            const context = getContext(width, height);
            context['adj'] = adj;

            context['a'] = Formula['pin'](context['0'], context['adj'], context['50000']);
            context['dx1'] = Formula['*/'](context['wd2'], context['92388'], context['100000']);
            context['dx2'] = Formula['*/'](context['wd2'], context['70711'], context['100000']);
            context['dx3'] = Formula['*/'](context['wd2'], context['38268'], context['100000']);
            context['dy1'] = Formula['*/'](context['hd2'], context['92388'], context['100000']);
            context['dy2'] = Formula['*/'](context['hd2'], context['70711'], context['100000']);
            context['dy3'] = Formula['*/'](context['hd2'], context['38268'], context['100000']);
            context['x1'] = Formula['+-'](context['hc'], context['0'], context['dx1']);
            context['x2'] = Formula['+-'](context['hc'], context['0'], context['dx2']);
            context['x3'] = Formula['+-'](context['hc'], context['0'], context['dx3']);
            context['x4'] = Formula['+-'](context['hc'], context['dx3'], context['0']);
            context['x5'] = Formula['+-'](context['hc'], context['dx2'], context['0']);
            context['x6'] = Formula['+-'](context['hc'], context['dx1'], context['0']);
            context['y1'] = Formula['+-'](context['vc'], context['0'], context['dy1']);
            context['y2'] = Formula['+-'](context['vc'], context['0'], context['dy2']);
            context['y3'] = Formula['+-'](context['vc'], context['0'], context['dy3']);
            context['y4'] = Formula['+-'](context['vc'], context['dy3'], context['0']);
            context['y5'] = Formula['+-'](context['vc'], context['dy2'], context['0']);
            context['y6'] = Formula['+-'](context['vc'], context['dy1'], context['0']);
            context['iwd2'] = Formula['*/'](context['wd2'], context['a'], context['50000']);
            context['ihd2'] = Formula['*/'](context['hd2'], context['a'], context['50000']);
            context['sdx1'] = Formula['*/'](context['iwd2'], context['98079'], context['100000']);
            context['sdx2'] = Formula['*/'](context['iwd2'], context['83147'], context['100000']);
            context['sdx3'] = Formula['*/'](context['iwd2'], context['55557'], context['100000']);
            context['sdx4'] = Formula['*/'](context['iwd2'], context['19509'], context['100000']);
            context['sdy1'] = Formula['*/'](context['ihd2'], context['98079'], context['100000']);
            context['sdy2'] = Formula['*/'](context['ihd2'], context['83147'], context['100000']);
            context['sdy3'] = Formula['*/'](context['ihd2'], context['55557'], context['100000']);
            context['sdy4'] = Formula['*/'](context['ihd2'], context['19509'], context['100000']);
            context['sx1'] = Formula['+-'](context['hc'], context['0'], context['sdx1']);
            context['sx2'] = Formula['+-'](context['hc'], context['0'], context['sdx2']);
            context['sx3'] = Formula['+-'](context['hc'], context['0'], context['sdx3']);
            context['sx4'] = Formula['+-'](context['hc'], context['0'], context['sdx4']);
            context['sx5'] = Formula['+-'](context['hc'], context['sdx4'], context['0']);
            context['sx6'] = Formula['+-'](context['hc'], context['sdx3'], context['0']);
            context['sx7'] = Formula['+-'](context['hc'], context['sdx2'], context['0']);
            context['sx8'] = Formula['+-'](context['hc'], context['sdx1'], context['0']);
            context['sy1'] = Formula['+-'](context['vc'], context['0'], context['sdy1']);
            context['sy2'] = Formula['+-'](context['vc'], context['0'], context['sdy2']);
            context['sy3'] = Formula['+-'](context['vc'], context['0'], context['sdy3']);
            context['sy4'] = Formula['+-'](context['vc'], context['0'], context['sdy4']);
            context['sy5'] = Formula['+-'](context['vc'], context['sdy4'], context['0']);
            context['sy6'] = Formula['+-'](context['vc'], context['sdy3'], context['0']);
            context['sy7'] = Formula['+-'](context['vc'], context['sdy2'], context['0']);
            context['sy8'] = Formula['+-'](context['vc'], context['sdy1'], context['0']);
            context['idx'] = Formula['cos'](context['iwd2'], context['2700000']);
            context['idy'] = Formula['sin'](context['ihd2'], context['2700000']);
            context['il'] = Formula['+-'](context['hc'], context['0'], context['idx']);
            context['it'] = Formula['+-'](context['vc'], context['0'], context['idy']);
            context['ir'] = Formula['+-'](context['hc'], context['idx'], context['0']);
            context['ib'] = Formula['+-'](context['vc'], context['idy'], context['0']);
            context['yAdj'] = Formula['+-'](context['vc'], context['0'], context['ihd2']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['vc'])} ${lineTo(
                            context,
                            context['sx1'],
                            context['sy4']
                        )} ${lineTo(context, context['x1'], context['y3'])} ${lineTo(
                            context,
                            context['sx2'],
                            context['sy3']
                        )} ${lineTo(context, context['x2'], context['y2'])} ${lineTo(
                            context,
                            context['sx3'],
                            context['sy2']
                        )} ${lineTo(context, context['x3'], context['y1'])} ${lineTo(
                            context,
                            context['sx4'],
                            context['sy1']
                        )} ${lineTo(context, context['hc'], context['t'])} ${lineTo(
                            context,
                            context['sx5'],
                            context['sy1']
                        )} ${lineTo(context, context['x4'], context['y1'])} ${lineTo(
                            context,
                            context['sx6'],
                            context['sy2']
                        )} ${lineTo(context, context['x5'], context['y2'])} ${lineTo(
                            context,
                            context['sx7'],
                            context['sy3']
                        )} ${lineTo(context, context['x6'], context['y3'])} ${lineTo(
                            context,
                            context['sx8'],
                            context['sy4']
                        )} ${lineTo(context, context['r'], context['vc'])} ${lineTo(
                            context,
                            context['sx8'],
                            context['sy5']
                        )} ${lineTo(context, context['x6'], context['y4'])} ${lineTo(
                            context,
                            context['sx7'],
                            context['sy6']
                        )} ${lineTo(context, context['x5'], context['y5'])} ${lineTo(
                            context,
                            context['sx6'],
                            context['sy7']
                        )} ${lineTo(context, context['x4'], context['y6'])} ${lineTo(
                            context,
                            context['sx5'],
                            context['sy8']
                        )} ${lineTo(context, context['hc'], context['b'])} ${lineTo(
                            context,
                            context['sx4'],
                            context['sy8']
                        )} ${lineTo(context, context['x3'], context['y6'])} ${lineTo(
                            context,
                            context['sx3'],
                            context['sy7']
                        )} ${lineTo(context, context['x2'], context['y5'])} ${lineTo(
                            context,
                            context['sx2'],
                            context['sy6']
                        )} ${lineTo(context, context['x1'], context['y4'])} ${lineTo(
                            context,
                            context['sx1'],
                            context['sy5']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.STAR24]: {
        editable: true,
        defaultValue: [37500],
        defaultKey: ['adj'],
        formula: (width: number, height: number, [adj]: number[]) => {
            const context = getContext(width, height);
            context['adj'] = adj;

            context['a'] = Formula['pin'](context['0'], context['adj'], context['50000']);
            context['dx1'] = Formula['cos'](context['wd2'], context['900000']);
            context['dx2'] = Formula['cos'](context['wd2'], context['1800000']);
            context['dx3'] = Formula['cos'](context['wd2'], context['2700000']);
            context['dx4'] = Formula['val'](context['wd4']);
            context['dx5'] = Formula['cos'](context['wd2'], context['4500000']);
            context['dy1'] = Formula['sin'](context['hd2'], context['4500000']);
            context['dy2'] = Formula['sin'](context['hd2'], context['3600000']);
            context['dy3'] = Formula['sin'](context['hd2'], context['2700000']);
            context['dy4'] = Formula['val'](context['hd4']);
            context['dy5'] = Formula['sin'](context['hd2'], context['900000']);
            context['x1'] = Formula['+-'](context['hc'], context['0'], context['dx1']);
            context['x2'] = Formula['+-'](context['hc'], context['0'], context['dx2']);
            context['x3'] = Formula['+-'](context['hc'], context['0'], context['dx3']);
            context['x4'] = Formula['+-'](context['hc'], context['0'], context['dx4']);
            context['x5'] = Formula['+-'](context['hc'], context['0'], context['dx5']);
            context['x6'] = Formula['+-'](context['hc'], context['dx5'], context['0']);
            context['x7'] = Formula['+-'](context['hc'], context['dx4'], context['0']);
            context['x8'] = Formula['+-'](context['hc'], context['dx3'], context['0']);
            context['x9'] = Formula['+-'](context['hc'], context['dx2'], context['0']);
            context['x10'] = Formula['+-'](context['hc'], context['dx1'], context['0']);
            context['y1'] = Formula['+-'](context['vc'], context['0'], context['dy1']);
            context['y2'] = Formula['+-'](context['vc'], context['0'], context['dy2']);
            context['y3'] = Formula['+-'](context['vc'], context['0'], context['dy3']);
            context['y4'] = Formula['+-'](context['vc'], context['0'], context['dy4']);
            context['y5'] = Formula['+-'](context['vc'], context['0'], context['dy5']);
            context['y6'] = Formula['+-'](context['vc'], context['dy5'], context['0']);
            context['y7'] = Formula['+-'](context['vc'], context['dy4'], context['0']);
            context['y8'] = Formula['+-'](context['vc'], context['dy3'], context['0']);
            context['y9'] = Formula['+-'](context['vc'], context['dy2'], context['0']);
            context['y10'] = Formula['+-'](context['vc'], context['dy1'], context['0']);
            context['iwd2'] = Formula['*/'](context['wd2'], context['a'], context['50000']);
            context['ihd2'] = Formula['*/'](context['hd2'], context['a'], context['50000']);
            context['sdx1'] = Formula['*/'](context['iwd2'], context['99144'], context['100000']);
            context['sdx2'] = Formula['*/'](context['iwd2'], context['92388'], context['100000']);
            context['sdx3'] = Formula['*/'](context['iwd2'], context['79335'], context['100000']);
            context['sdx4'] = Formula['*/'](context['iwd2'], context['60876'], context['100000']);
            context['sdx5'] = Formula['*/'](context['iwd2'], context['38268'], context['100000']);
            context['sdx6'] = Formula['*/'](context['iwd2'], context['13053'], context['100000']);
            context['sdy1'] = Formula['*/'](context['ihd2'], context['99144'], context['100000']);
            context['sdy2'] = Formula['*/'](context['ihd2'], context['92388'], context['100000']);
            context['sdy3'] = Formula['*/'](context['ihd2'], context['79335'], context['100000']);
            context['sdy4'] = Formula['*/'](context['ihd2'], context['60876'], context['100000']);
            context['sdy5'] = Formula['*/'](context['ihd2'], context['38268'], context['100000']);
            context['sdy6'] = Formula['*/'](context['ihd2'], context['13053'], context['100000']);
            context['sx1'] = Formula['+-'](context['hc'], context['0'], context['sdx1']);
            context['sx2'] = Formula['+-'](context['hc'], context['0'], context['sdx2']);
            context['sx3'] = Formula['+-'](context['hc'], context['0'], context['sdx3']);
            context['sx4'] = Formula['+-'](context['hc'], context['0'], context['sdx4']);
            context['sx5'] = Formula['+-'](context['hc'], context['0'], context['sdx5']);
            context['sx6'] = Formula['+-'](context['hc'], context['0'], context['sdx6']);
            context['sx7'] = Formula['+-'](context['hc'], context['sdx6'], context['0']);
            context['sx8'] = Formula['+-'](context['hc'], context['sdx5'], context['0']);
            context['sx9'] = Formula['+-'](context['hc'], context['sdx4'], context['0']);
            context['sx10'] = Formula['+-'](context['hc'], context['sdx3'], context['0']);
            context['sx11'] = Formula['+-'](context['hc'], context['sdx2'], context['0']);
            context['sx12'] = Formula['+-'](context['hc'], context['sdx1'], context['0']);
            context['sy1'] = Formula['+-'](context['vc'], context['0'], context['sdy1']);
            context['sy2'] = Formula['+-'](context['vc'], context['0'], context['sdy2']);
            context['sy3'] = Formula['+-'](context['vc'], context['0'], context['sdy3']);
            context['sy4'] = Formula['+-'](context['vc'], context['0'], context['sdy4']);
            context['sy5'] = Formula['+-'](context['vc'], context['0'], context['sdy5']);
            context['sy6'] = Formula['+-'](context['vc'], context['0'], context['sdy6']);
            context['sy7'] = Formula['+-'](context['vc'], context['sdy6'], context['0']);
            context['sy8'] = Formula['+-'](context['vc'], context['sdy5'], context['0']);
            context['sy9'] = Formula['+-'](context['vc'], context['sdy4'], context['0']);
            context['sy10'] = Formula['+-'](context['vc'], context['sdy3'], context['0']);
            context['sy11'] = Formula['+-'](context['vc'], context['sdy2'], context['0']);
            context['sy12'] = Formula['+-'](context['vc'], context['sdy1'], context['0']);
            context['idx'] = Formula['cos'](context['iwd2'], context['2700000']);
            context['idy'] = Formula['sin'](context['ihd2'], context['2700000']);
            context['il'] = Formula['+-'](context['hc'], context['0'], context['idx']);
            context['it'] = Formula['+-'](context['vc'], context['0'], context['idy']);
            context['ir'] = Formula['+-'](context['hc'], context['idx'], context['0']);
            context['ib'] = Formula['+-'](context['vc'], context['idy'], context['0']);
            context['yAdj'] = Formula['+-'](context['vc'], context['0'], context['ihd2']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['vc'])} ${lineTo(
                            context,
                            context['sx1'],
                            context['sy6']
                        )} ${lineTo(context, context['x1'], context['y5'])} ${lineTo(
                            context,
                            context['sx2'],
                            context['sy5']
                        )} ${lineTo(context, context['x2'], context['y4'])} ${lineTo(
                            context,
                            context['sx3'],
                            context['sy4']
                        )} ${lineTo(context, context['x3'], context['y3'])} ${lineTo(
                            context,
                            context['sx4'],
                            context['sy3']
                        )} ${lineTo(context, context['x4'], context['y2'])} ${lineTo(
                            context,
                            context['sx5'],
                            context['sy2']
                        )} ${lineTo(context, context['x5'], context['y1'])} ${lineTo(
                            context,
                            context['sx6'],
                            context['sy1']
                        )} ${lineTo(context, context['hc'], context['t'])} ${lineTo(
                            context,
                            context['sx7'],
                            context['sy1']
                        )} ${lineTo(context, context['x6'], context['y1'])} ${lineTo(
                            context,
                            context['sx8'],
                            context['sy2']
                        )} ${lineTo(context, context['x7'], context['y2'])} ${lineTo(
                            context,
                            context['sx9'],
                            context['sy3']
                        )} ${lineTo(context, context['x8'], context['y3'])} ${lineTo(
                            context,
                            context['sx10'],
                            context['sy4']
                        )} ${lineTo(context, context['x9'], context['y4'])} ${lineTo(
                            context,
                            context['sx11'],
                            context['sy5']
                        )} ${lineTo(context, context['x10'], context['y5'])} ${lineTo(
                            context,
                            context['sx12'],
                            context['sy6']
                        )} ${lineTo(context, context['r'], context['vc'])} ${lineTo(
                            context,
                            context['sx12'],
                            context['sy7']
                        )} ${lineTo(context, context['x10'], context['y6'])} ${lineTo(
                            context,
                            context['sx11'],
                            context['sy8']
                        )} ${lineTo(context, context['x9'], context['y7'])} ${lineTo(
                            context,
                            context['sx10'],
                            context['sy9']
                        )} ${lineTo(context, context['x8'], context['y8'])} ${lineTo(
                            context,
                            context['sx9'],
                            context['sy10']
                        )} ${lineTo(context, context['x7'], context['y9'])} ${lineTo(
                            context,
                            context['sx8'],
                            context['sy11']
                        )} ${lineTo(context, context['x6'], context['y10'])} ${lineTo(
                            context,
                            context['sx7'],
                            context['sy12']
                        )} ${lineTo(context, context['hc'], context['b'])} ${lineTo(
                            context,
                            context['sx6'],
                            context['sy12']
                        )} ${lineTo(context, context['x5'], context['y10'])} ${lineTo(
                            context,
                            context['sx5'],
                            context['sy11']
                        )} ${lineTo(context, context['x4'], context['y9'])} ${lineTo(
                            context,
                            context['sx4'],
                            context['sy10']
                        )} ${lineTo(context, context['x3'], context['y8'])} ${lineTo(
                            context,
                            context['sx3'],
                            context['sy9']
                        )} ${lineTo(context, context['x2'], context['y7'])} ${lineTo(
                            context,
                            context['sx2'],
                            context['sy8']
                        )} ${lineTo(context, context['x1'], context['y6'])} ${lineTo(
                            context,
                            context['sx1'],
                            context['sy7']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.STAR32]: {
        editable: true,
        defaultValue: [37500],
        defaultKey: ['adj'],
        formula: (width: number, height: number, [adj]: number[]) => {
            const context = getContext(width, height);
            context['adj'] = adj;

            context['a'] = Formula['pin'](context['0'], context['adj'], context['50000']);
            context['dx1'] = Formula['*/'](context['wd2'], context['98079'], context['100000']);
            context['dx2'] = Formula['*/'](context['wd2'], context['92388'], context['100000']);
            context['dx3'] = Formula['*/'](context['wd2'], context['83147'], context['100000']);
            context['dx4'] = Formula['cos'](context['wd2'], context['2700000']);
            context['dx5'] = Formula['*/'](context['wd2'], context['55557'], context['100000']);
            context['dx6'] = Formula['*/'](context['wd2'], context['38268'], context['100000']);
            context['dx7'] = Formula['*/'](context['wd2'], context['19509'], context['100000']);
            context['dy1'] = Formula['*/'](context['hd2'], context['98079'], context['100000']);
            context['dy2'] = Formula['*/'](context['hd2'], context['92388'], context['100000']);
            context['dy3'] = Formula['*/'](context['hd2'], context['83147'], context['100000']);
            context['dy4'] = Formula['sin'](context['hd2'], context['2700000']);
            context['dy5'] = Formula['*/'](context['hd2'], context['55557'], context['100000']);
            context['dy6'] = Formula['*/'](context['hd2'], context['38268'], context['100000']);
            context['dy7'] = Formula['*/'](context['hd2'], context['19509'], context['100000']);
            context['x1'] = Formula['+-'](context['hc'], context['0'], context['dx1']);
            context['x2'] = Formula['+-'](context['hc'], context['0'], context['dx2']);
            context['x3'] = Formula['+-'](context['hc'], context['0'], context['dx3']);
            context['x4'] = Formula['+-'](context['hc'], context['0'], context['dx4']);
            context['x5'] = Formula['+-'](context['hc'], context['0'], context['dx5']);
            context['x6'] = Formula['+-'](context['hc'], context['0'], context['dx6']);
            context['x7'] = Formula['+-'](context['hc'], context['0'], context['dx7']);
            context['x8'] = Formula['+-'](context['hc'], context['dx7'], context['0']);
            context['x9'] = Formula['+-'](context['hc'], context['dx6'], context['0']);
            context['x10'] = Formula['+-'](context['hc'], context['dx5'], context['0']);
            context['x11'] = Formula['+-'](context['hc'], context['dx4'], context['0']);
            context['x12'] = Formula['+-'](context['hc'], context['dx3'], context['0']);
            context['x13'] = Formula['+-'](context['hc'], context['dx2'], context['0']);
            context['x14'] = Formula['+-'](context['hc'], context['dx1'], context['0']);
            context['y1'] = Formula['+-'](context['vc'], context['0'], context['dy1']);
            context['y2'] = Formula['+-'](context['vc'], context['0'], context['dy2']);
            context['y3'] = Formula['+-'](context['vc'], context['0'], context['dy3']);
            context['y4'] = Formula['+-'](context['vc'], context['0'], context['dy4']);
            context['y5'] = Formula['+-'](context['vc'], context['0'], context['dy5']);
            context['y6'] = Formula['+-'](context['vc'], context['0'], context['dy6']);
            context['y7'] = Formula['+-'](context['vc'], context['0'], context['dy7']);
            context['y8'] = Formula['+-'](context['vc'], context['dy7'], context['0']);
            context['y9'] = Formula['+-'](context['vc'], context['dy6'], context['0']);
            context['y10'] = Formula['+-'](context['vc'], context['dy5'], context['0']);
            context['y11'] = Formula['+-'](context['vc'], context['dy4'], context['0']);
            context['y12'] = Formula['+-'](context['vc'], context['dy3'], context['0']);
            context['y13'] = Formula['+-'](context['vc'], context['dy2'], context['0']);
            context['y14'] = Formula['+-'](context['vc'], context['dy1'], context['0']);
            context['iwd2'] = Formula['*/'](context['wd2'], context['a'], context['50000']);
            context['ihd2'] = Formula['*/'](context['hd2'], context['a'], context['50000']);
            context['sdx1'] = Formula['*/'](context['iwd2'], context['99518'], context['100000']);
            context['sdx2'] = Formula['*/'](context['iwd2'], context['95694'], context['100000']);
            context['sdx3'] = Formula['*/'](context['iwd2'], context['88192'], context['100000']);
            context['sdx4'] = Formula['*/'](context['iwd2'], context['77301'], context['100000']);
            context['sdx5'] = Formula['*/'](context['iwd2'], context['63439'], context['100000']);
            context['sdx6'] = Formula['*/'](context['iwd2'], context['47140'], context['100000']);
            context['sdx7'] = Formula['*/'](context['iwd2'], context['29028'], context['100000']);
            context['sdx8'] = Formula['*/'](context['iwd2'], context['9802'], context['100000']);
            context['sdy1'] = Formula['*/'](context['ihd2'], context['99518'], context['100000']);
            context['sdy2'] = Formula['*/'](context['ihd2'], context['95694'], context['100000']);
            context['sdy3'] = Formula['*/'](context['ihd2'], context['88192'], context['100000']);
            context['sdy4'] = Formula['*/'](context['ihd2'], context['77301'], context['100000']);
            context['sdy5'] = Formula['*/'](context['ihd2'], context['63439'], context['100000']);
            context['sdy6'] = Formula['*/'](context['ihd2'], context['47140'], context['100000']);
            context['sdy7'] = Formula['*/'](context['ihd2'], context['29028'], context['100000']);
            context['sdy8'] = Formula['*/'](context['ihd2'], context['9802'], context['100000']);
            context['sx1'] = Formula['+-'](context['hc'], context['0'], context['sdx1']);
            context['sx2'] = Formula['+-'](context['hc'], context['0'], context['sdx2']);
            context['sx3'] = Formula['+-'](context['hc'], context['0'], context['sdx3']);
            context['sx4'] = Formula['+-'](context['hc'], context['0'], context['sdx4']);
            context['sx5'] = Formula['+-'](context['hc'], context['0'], context['sdx5']);
            context['sx6'] = Formula['+-'](context['hc'], context['0'], context['sdx6']);
            context['sx7'] = Formula['+-'](context['hc'], context['0'], context['sdx7']);
            context['sx8'] = Formula['+-'](context['hc'], context['0'], context['sdx8']);
            context['sx9'] = Formula['+-'](context['hc'], context['sdx8'], context['0']);
            context['sx10'] = Formula['+-'](context['hc'], context['sdx7'], context['0']);
            context['sx11'] = Formula['+-'](context['hc'], context['sdx6'], context['0']);
            context['sx12'] = Formula['+-'](context['hc'], context['sdx5'], context['0']);
            context['sx13'] = Formula['+-'](context['hc'], context['sdx4'], context['0']);
            context['sx14'] = Formula['+-'](context['hc'], context['sdx3'], context['0']);
            context['sx15'] = Formula['+-'](context['hc'], context['sdx2'], context['0']);
            context['sx16'] = Formula['+-'](context['hc'], context['sdx1'], context['0']);
            context['sy1'] = Formula['+-'](context['vc'], context['0'], context['sdy1']);
            context['sy2'] = Formula['+-'](context['vc'], context['0'], context['sdy2']);
            context['sy3'] = Formula['+-'](context['vc'], context['0'], context['sdy3']);
            context['sy4'] = Formula['+-'](context['vc'], context['0'], context['sdy4']);
            context['sy5'] = Formula['+-'](context['vc'], context['0'], context['sdy5']);
            context['sy6'] = Formula['+-'](context['vc'], context['0'], context['sdy6']);
            context['sy7'] = Formula['+-'](context['vc'], context['0'], context['sdy7']);
            context['sy8'] = Formula['+-'](context['vc'], context['0'], context['sdy8']);
            context['sy9'] = Formula['+-'](context['vc'], context['sdy8'], context['0']);
            context['sy10'] = Formula['+-'](context['vc'], context['sdy7'], context['0']);
            context['sy11'] = Formula['+-'](context['vc'], context['sdy6'], context['0']);
            context['sy12'] = Formula['+-'](context['vc'], context['sdy5'], context['0']);
            context['sy13'] = Formula['+-'](context['vc'], context['sdy4'], context['0']);
            context['sy14'] = Formula['+-'](context['vc'], context['sdy3'], context['0']);
            context['sy15'] = Formula['+-'](context['vc'], context['sdy2'], context['0']);
            context['sy16'] = Formula['+-'](context['vc'], context['sdy1'], context['0']);
            context['idx'] = Formula['cos'](context['iwd2'], context['2700000']);
            context['idy'] = Formula['sin'](context['ihd2'], context['2700000']);
            context['il'] = Formula['+-'](context['hc'], context['0'], context['idx']);
            context['it'] = Formula['+-'](context['vc'], context['0'], context['idy']);
            context['ir'] = Formula['+-'](context['hc'], context['idx'], context['0']);
            context['ib'] = Formula['+-'](context['vc'], context['idy'], context['0']);
            context['yAdj'] = Formula['+-'](context['vc'], context['0'], context['ihd2']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['vc'])} ${lineTo(
                            context,
                            context['sx1'],
                            context['sy8']
                        )} ${lineTo(context, context['x1'], context['y7'])} ${lineTo(
                            context,
                            context['sx2'],
                            context['sy7']
                        )} ${lineTo(context, context['x2'], context['y6'])} ${lineTo(
                            context,
                            context['sx3'],
                            context['sy6']
                        )} ${lineTo(context, context['x3'], context['y5'])} ${lineTo(
                            context,
                            context['sx4'],
                            context['sy5']
                        )} ${lineTo(context, context['x4'], context['y4'])} ${lineTo(
                            context,
                            context['sx5'],
                            context['sy4']
                        )} ${lineTo(context, context['x5'], context['y3'])} ${lineTo(
                            context,
                            context['sx6'],
                            context['sy3']
                        )} ${lineTo(context, context['x6'], context['y2'])} ${lineTo(
                            context,
                            context['sx7'],
                            context['sy2']
                        )} ${lineTo(context, context['x7'], context['y1'])} ${lineTo(
                            context,
                            context['sx8'],
                            context['sy1']
                        )} ${lineTo(context, context['hc'], context['t'])} ${lineTo(
                            context,
                            context['sx9'],
                            context['sy1']
                        )} ${lineTo(context, context['x8'], context['y1'])} ${lineTo(
                            context,
                            context['sx10'],
                            context['sy2']
                        )} ${lineTo(context, context['x9'], context['y2'])} ${lineTo(
                            context,
                            context['sx11'],
                            context['sy3']
                        )} ${lineTo(context, context['x10'], context['y3'])} ${lineTo(
                            context,
                            context['sx12'],
                            context['sy4']
                        )} ${lineTo(context, context['x11'], context['y4'])} ${lineTo(
                            context,
                            context['sx13'],
                            context['sy5']
                        )} ${lineTo(context, context['x12'], context['y5'])} ${lineTo(
                            context,
                            context['sx14'],
                            context['sy6']
                        )} ${lineTo(context, context['x13'], context['y6'])} ${lineTo(
                            context,
                            context['sx15'],
                            context['sy7']
                        )} ${lineTo(context, context['x14'], context['y7'])} ${lineTo(
                            context,
                            context['sx16'],
                            context['sy8']
                        )} ${lineTo(context, context['r'], context['vc'])} ${lineTo(
                            context,
                            context['sx16'],
                            context['sy9']
                        )} ${lineTo(context, context['x14'], context['y8'])} ${lineTo(
                            context,
                            context['sx15'],
                            context['sy10']
                        )} ${lineTo(context, context['x13'], context['y9'])} ${lineTo(
                            context,
                            context['sx14'],
                            context['sy11']
                        )} ${lineTo(context, context['x12'], context['y10'])} ${lineTo(
                            context,
                            context['sx13'],
                            context['sy12']
                        )} ${lineTo(context, context['x11'], context['y11'])} ${lineTo(
                            context,
                            context['sx12'],
                            context['sy13']
                        )} ${lineTo(context, context['x10'], context['y12'])} ${lineTo(
                            context,
                            context['sx11'],
                            context['sy14']
                        )} ${lineTo(context, context['x9'], context['y13'])} ${lineTo(
                            context,
                            context['sx10'],
                            context['sy15']
                        )} ${lineTo(context, context['x8'], context['y14'])} ${lineTo(
                            context,
                            context['sx9'],
                            context['sy16']
                        )} ${lineTo(context, context['hc'], context['b'])} ${lineTo(
                            context,
                            context['sx8'],
                            context['sy16']
                        )} ${lineTo(context, context['x7'], context['y14'])} ${lineTo(
                            context,
                            context['sx7'],
                            context['sy15']
                        )} ${lineTo(context, context['x6'], context['y13'])} ${lineTo(
                            context,
                            context['sx6'],
                            context['sy14']
                        )} ${lineTo(context, context['x5'], context['y12'])} ${lineTo(
                            context,
                            context['sx5'],
                            context['sy13']
                        )} ${lineTo(context, context['x4'], context['y11'])} ${lineTo(
                            context,
                            context['sx4'],
                            context['sy12']
                        )} ${lineTo(context, context['x3'], context['y10'])} ${lineTo(
                            context,
                            context['sx3'],
                            context['sy11']
                        )} ${lineTo(context, context['x2'], context['y9'])} ${lineTo(
                            context,
                            context['sx2'],
                            context['sy10']
                        )} ${lineTo(context, context['x1'], context['y8'])} ${lineTo(
                            context,
                            context['sx1'],
                            context['sy9']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.STAR4]: {
        editable: true,
        defaultValue: [12500],
        defaultKey: ['adj'],
        formula: (width: number, height: number, [adj]: number[]) => {
            const context = getContext(width, height);
            context['adj'] = adj;

            context['a'] = Formula['pin'](context['0'], context['adj'], context['50000']);
            context['iwd2'] = Formula['*/'](context['wd2'], context['a'], context['50000']);
            context['ihd2'] = Formula['*/'](context['hd2'], context['a'], context['50000']);
            context['sdx'] = Formula['cos'](context['iwd2'], context['2700000']);
            context['sdy'] = Formula['sin'](context['ihd2'], context['2700000']);
            context['sx1'] = Formula['+-'](context['hc'], context['0'], context['sdx']);
            context['sx2'] = Formula['+-'](context['hc'], context['sdx'], context['0']);
            context['sy1'] = Formula['+-'](context['vc'], context['0'], context['sdy']);
            context['sy2'] = Formula['+-'](context['vc'], context['sdy'], context['0']);
            context['yAdj'] = Formula['+-'](context['vc'], context['0'], context['ihd2']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['vc'])} ${lineTo(
                            context,
                            context['sx1'],
                            context['sy1']
                        )} ${lineTo(context, context['hc'], context['t'])} ${lineTo(
                            context,
                            context['sx2'],
                            context['sy1']
                        )} ${lineTo(context, context['r'], context['vc'])} ${lineTo(
                            context,
                            context['sx2'],
                            context['sy2']
                        )} ${lineTo(context, context['hc'], context['b'])} ${lineTo(
                            context,
                            context['sx1'],
                            context['sy2']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.STAR5]: {
        editable: true,
        defaultValue: [19098, 105146, 110557],
        defaultKey: ['adj', 'hf', 'vf'],
        formula: (width: number, height: number, [adj, hf, vf]: number[]) => {
            const context = getContext(width, height);
            context['adj'] = adj;
            context['hf'] = hf;
            context['vf'] = vf;

            context['a'] = Formula['pin'](context['0'], context['adj'], context['50000']);
            context['swd2'] = Formula['*/'](context['wd2'], context['hf'], context['100000']);
            context['shd2'] = Formula['*/'](context['hd2'], context['vf'], context['100000']);
            context['svc'] = Formula['*/'](context['vc'], context['vf'], context['100000']);
            context['dx1'] = Formula['cos'](context['swd2'], context['1080000']);
            context['dx2'] = Formula['cos'](context['swd2'], context['18360000']);
            context['dy1'] = Formula['sin'](context['shd2'], context['1080000']);
            context['dy2'] = Formula['sin'](context['shd2'], context['18360000']);
            context['x1'] = Formula['+-'](context['hc'], context['0'], context['dx1']);
            context['x2'] = Formula['+-'](context['hc'], context['0'], context['dx2']);
            context['x3'] = Formula['+-'](context['hc'], context['dx2'], context['0']);
            context['x4'] = Formula['+-'](context['hc'], context['dx1'], context['0']);
            context['y1'] = Formula['+-'](context['svc'], context['0'], context['dy1']);
            context['y2'] = Formula['+-'](context['svc'], context['0'], context['dy2']);
            context['iwd2'] = Formula['*/'](context['swd2'], context['a'], context['50000']);
            context['ihd2'] = Formula['*/'](context['shd2'], context['a'], context['50000']);
            context['sdx1'] = Formula['cos'](context['iwd2'], context['20520000']);
            context['sdx2'] = Formula['cos'](context['iwd2'], context['3240000']);
            context['sdy1'] = Formula['sin'](context['ihd2'], context['3240000']);
            context['sdy2'] = Formula['sin'](context['ihd2'], context['20520000']);
            context['sx1'] = Formula['+-'](context['hc'], context['0'], context['sdx1']);
            context['sx2'] = Formula['+-'](context['hc'], context['0'], context['sdx2']);
            context['sx3'] = Formula['+-'](context['hc'], context['sdx2'], context['0']);
            context['sx4'] = Formula['+-'](context['hc'], context['sdx1'], context['0']);
            context['sy1'] = Formula['+-'](context['svc'], context['0'], context['sdy1']);
            context['sy2'] = Formula['+-'](context['svc'], context['0'], context['sdy2']);
            context['sy3'] = Formula['+-'](context['svc'], context['ihd2'], context['0']);
            context['yAdj'] = Formula['+-'](context['svc'], context['0'], context['ihd2']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['x1'], context['y1'])} ${lineTo(
                            context,
                            context['sx2'],
                            context['sy1']
                        )} ${lineTo(context, context['hc'], context['t'])} ${lineTo(
                            context,
                            context['sx3'],
                            context['sy1']
                        )} ${lineTo(context, context['x4'], context['y1'])} ${lineTo(
                            context,
                            context['sx4'],
                            context['sy2']
                        )} ${lineTo(context, context['x3'], context['y2'])} ${lineTo(
                            context,
                            context['hc'],
                            context['sy3']
                        )} ${lineTo(context, context['x2'], context['y2'])} ${lineTo(
                            context,
                            context['sx1'],
                            context['sy2']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.STAR6]: {
        editable: true,
        defaultValue: [28868, 115470],
        defaultKey: ['adj', 'hf'],
        formula: (width: number, height: number, [adj, hf]: number[]) => {
            const context = getContext(width, height);
            context['adj'] = adj;
            context['hf'] = hf;

            context['a'] = Formula['pin'](context['0'], context['adj'], context['50000']);
            context['swd2'] = Formula['*/'](context['wd2'], context['hf'], context['100000']);
            context['dx1'] = Formula['cos'](context['swd2'], context['1800000']);
            context['x1'] = Formula['+-'](context['hc'], context['0'], context['dx1']);
            context['x2'] = Formula['+-'](context['hc'], context['dx1'], context['0']);
            context['y2'] = Formula['+-'](context['vc'], context['hd4'], context['0']);
            context['iwd2'] = Formula['*/'](context['swd2'], context['a'], context['50000']);
            context['ihd2'] = Formula['*/'](context['hd2'], context['a'], context['50000']);
            context['sdx2'] = Formula['*/'](context['iwd2'], context['1'], context['2']);
            context['sx1'] = Formula['+-'](context['hc'], context['0'], context['iwd2']);
            context['sx2'] = Formula['+-'](context['hc'], context['0'], context['sdx2']);
            context['sx3'] = Formula['+-'](context['hc'], context['sdx2'], context['0']);
            context['sx4'] = Formula['+-'](context['hc'], context['iwd2'], context['0']);
            context['sdy1'] = Formula['sin'](context['ihd2'], context['3600000']);
            context['sy1'] = Formula['+-'](context['vc'], context['0'], context['sdy1']);
            context['sy2'] = Formula['+-'](context['vc'], context['sdy1'], context['0']);
            context['yAdj'] = Formula['+-'](context['vc'], context['0'], context['ihd2']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['x1'], context['hd4'])} ${lineTo(
                            context,
                            context['sx2'],
                            context['sy1']
                        )} ${lineTo(context, context['hc'], context['t'])} ${lineTo(
                            context,
                            context['sx3'],
                            context['sy1']
                        )} ${lineTo(context, context['x2'], context['hd4'])} ${lineTo(
                            context,
                            context['sx4'],
                            context['vc']
                        )} ${lineTo(context, context['x2'], context['y2'])} ${lineTo(
                            context,
                            context['sx3'],
                            context['sy2']
                        )} ${lineTo(context, context['hc'], context['b'])} ${lineTo(
                            context,
                            context['sx2'],
                            context['sy2']
                        )} ${lineTo(context, context['x1'], context['y2'])} ${lineTo(
                            context,
                            context['sx1'],
                            context['vc']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.STAR7]: {
        editable: true,
        defaultValue: [34601, 102572, 105210],
        defaultKey: ['adj', 'hf', 'vf'],
        formula: (width: number, height: number, [adj, hf, vf]: number[]) => {
            const context = getContext(width, height);
            context['adj'] = adj;
            context['hf'] = hf;
            context['vf'] = vf;

            context['a'] = Formula['pin'](context['0'], context['adj'], context['50000']);
            context['swd2'] = Formula['*/'](context['wd2'], context['hf'], context['100000']);
            context['shd2'] = Formula['*/'](context['hd2'], context['vf'], context['100000']);
            context['svc'] = Formula['*/'](context['vc'], context['vf'], context['100000']);
            context['dx1'] = Formula['*/'](context['swd2'], context['97493'], context['100000']);
            context['dx2'] = Formula['*/'](context['swd2'], context['78183'], context['100000']);
            context['dx3'] = Formula['*/'](context['swd2'], context['43388'], context['100000']);
            context['dy1'] = Formula['*/'](context['shd2'], context['62349'], context['100000']);
            context['dy2'] = Formula['*/'](context['shd2'], context['22252'], context['100000']);
            context['dy3'] = Formula['*/'](context['shd2'], context['90097'], context['100000']);
            context['x1'] = Formula['+-'](context['hc'], context['0'], context['dx1']);
            context['x2'] = Formula['+-'](context['hc'], context['0'], context['dx2']);
            context['x3'] = Formula['+-'](context['hc'], context['0'], context['dx3']);
            context['x4'] = Formula['+-'](context['hc'], context['dx3'], context['0']);
            context['x5'] = Formula['+-'](context['hc'], context['dx2'], context['0']);
            context['x6'] = Formula['+-'](context['hc'], context['dx1'], context['0']);
            context['y1'] = Formula['+-'](context['svc'], context['0'], context['dy1']);
            context['y2'] = Formula['+-'](context['svc'], context['dy2'], context['0']);
            context['y3'] = Formula['+-'](context['svc'], context['dy3'], context['0']);
            context['iwd2'] = Formula['*/'](context['swd2'], context['a'], context['50000']);
            context['ihd2'] = Formula['*/'](context['shd2'], context['a'], context['50000']);
            context['sdx1'] = Formula['*/'](context['iwd2'], context['97493'], context['100000']);
            context['sdx2'] = Formula['*/'](context['iwd2'], context['78183'], context['100000']);
            context['sdx3'] = Formula['*/'](context['iwd2'], context['43388'], context['100000']);
            context['sx1'] = Formula['+-'](context['hc'], context['0'], context['sdx1']);
            context['sx2'] = Formula['+-'](context['hc'], context['0'], context['sdx2']);
            context['sx3'] = Formula['+-'](context['hc'], context['0'], context['sdx3']);
            context['sx4'] = Formula['+-'](context['hc'], context['sdx3'], context['0']);
            context['sx5'] = Formula['+-'](context['hc'], context['sdx2'], context['0']);
            context['sx6'] = Formula['+-'](context['hc'], context['sdx1'], context['0']);
            context['sdy1'] = Formula['*/'](context['ihd2'], context['90097'], context['100000']);
            context['sdy2'] = Formula['*/'](context['ihd2'], context['22252'], context['100000']);
            context['sdy3'] = Formula['*/'](context['ihd2'], context['62349'], context['100000']);
            context['sy1'] = Formula['+-'](context['svc'], context['0'], context['sdy1']);
            context['sy2'] = Formula['+-'](context['svc'], context['0'], context['sdy2']);
            context['sy3'] = Formula['+-'](context['svc'], context['sdy3'], context['0']);
            context['sy4'] = Formula['+-'](context['svc'], context['ihd2'], context['0']);
            context['yAdj'] = Formula['+-'](context['svc'], context['0'], context['ihd2']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['x1'], context['y2'])} ${lineTo(
                            context,
                            context['sx1'],
                            context['sy2']
                        )} ${lineTo(context, context['x2'], context['y1'])} ${lineTo(
                            context,
                            context['sx3'],
                            context['sy1']
                        )} ${lineTo(context, context['hc'], context['t'])} ${lineTo(
                            context,
                            context['sx4'],
                            context['sy1']
                        )} ${lineTo(context, context['x5'], context['y1'])} ${lineTo(
                            context,
                            context['sx6'],
                            context['sy2']
                        )} ${lineTo(context, context['x6'], context['y2'])} ${lineTo(
                            context,
                            context['sx5'],
                            context['sy3']
                        )} ${lineTo(context, context['x4'], context['y3'])} ${lineTo(
                            context,
                            context['hc'],
                            context['sy4']
                        )} ${lineTo(context, context['x3'], context['y3'])} ${lineTo(
                            context,
                            context['sx2'],
                            context['sy3']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.STAR8]: {
        editable: true,
        defaultValue: [37500],
        defaultKey: ['adj'],
        formula: (width: number, height: number, [adj]: number[]) => {
            const context = getContext(width, height);
            context['adj'] = adj;

            context['a'] = Formula['pin'](context['0'], context['adj'], context['50000']);
            context['dx1'] = Formula['cos'](context['wd2'], context['2700000']);
            context['x1'] = Formula['+-'](context['hc'], context['0'], context['dx1']);
            context['x2'] = Formula['+-'](context['hc'], context['dx1'], context['0']);
            context['dy1'] = Formula['sin'](context['hd2'], context['2700000']);
            context['y1'] = Formula['+-'](context['vc'], context['0'], context['dy1']);
            context['y2'] = Formula['+-'](context['vc'], context['dy1'], context['0']);
            context['iwd2'] = Formula['*/'](context['wd2'], context['a'], context['50000']);
            context['ihd2'] = Formula['*/'](context['hd2'], context['a'], context['50000']);
            context['sdx1'] = Formula['*/'](context['iwd2'], context['92388'], context['100000']);
            context['sdx2'] = Formula['*/'](context['iwd2'], context['38268'], context['100000']);
            context['sdy1'] = Formula['*/'](context['ihd2'], context['92388'], context['100000']);
            context['sdy2'] = Formula['*/'](context['ihd2'], context['38268'], context['100000']);
            context['sx1'] = Formula['+-'](context['hc'], context['0'], context['sdx1']);
            context['sx2'] = Formula['+-'](context['hc'], context['0'], context['sdx2']);
            context['sx3'] = Formula['+-'](context['hc'], context['sdx2'], context['0']);
            context['sx4'] = Formula['+-'](context['hc'], context['sdx1'], context['0']);
            context['sy1'] = Formula['+-'](context['vc'], context['0'], context['sdy1']);
            context['sy2'] = Formula['+-'](context['vc'], context['0'], context['sdy2']);
            context['sy3'] = Formula['+-'](context['vc'], context['sdy2'], context['0']);
            context['sy4'] = Formula['+-'](context['vc'], context['sdy1'], context['0']);
            context['yAdj'] = Formula['+-'](context['vc'], context['0'], context['ihd2']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['vc'])} ${lineTo(
                            context,
                            context['sx1'],
                            context['sy2']
                        )} ${lineTo(context, context['x1'], context['y1'])} ${lineTo(
                            context,
                            context['sx2'],
                            context['sy1']
                        )} ${lineTo(context, context['hc'], context['t'])} ${lineTo(
                            context,
                            context['sx3'],
                            context['sy1']
                        )} ${lineTo(context, context['x2'], context['y1'])} ${lineTo(
                            context,
                            context['sx4'],
                            context['sy2']
                        )} ${lineTo(context, context['r'], context['vc'])} ${lineTo(
                            context,
                            context['sx4'],
                            context['sy3']
                        )} ${lineTo(context, context['x2'], context['y2'])} ${lineTo(
                            context,
                            context['sx3'],
                            context['sy4']
                        )} ${lineTo(context, context['hc'], context['b'])} ${lineTo(
                            context,
                            context['sx2'],
                            context['sy4']
                        )} ${lineTo(context, context['x1'], context['y2'])} ${lineTo(
                            context,
                            context['sx1'],
                            context['sy3']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.STRAIGHT_CONNECTOR1]: {
        editable: false,
        defaultValue: [],
        defaultKey: [],
        formula: (width: number, height: number, []: number[]) => {
            const context = getContext(width, height);

            return [
                {
                    d: path(context, { fill: 'none' }, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['b']
                        )}`;
                    }),
                    attrs: { fill: 'none' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.STRIPED_RIGHT_ARROW]: {
        editable: true,
        defaultValue: [50000, 50000],
        defaultKey: ['adj1', 'adj2'],
        formula: (width: number, height: number, [adj1, adj2]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;

            context['maxAdj2'] = Formula['*/'](context['84375'], context['w'], context['ss']);
            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['100000']);
            context['a2'] = Formula['pin'](context['0'], context['adj2'], context['maxAdj2']);
            context['x4'] = Formula['*/'](context['ss'], context['5'], context['32']);
            context['dx5'] = Formula['*/'](context['ss'], context['a2'], context['100000']);
            context['x5'] = Formula['+-'](context['r'], context['0'], context['dx5']);
            context['dy1'] = Formula['*/'](context['h'], context['a1'], context['200000']);
            context['y1'] = Formula['+-'](context['vc'], context['0'], context['dy1']);
            context['y2'] = Formula['+-'](context['vc'], context['dy1'], context['0']);
            context['dx6'] = Formula['*/'](context['dy1'], context['dx5'], context['hd2']);
            context['x6'] = Formula['+-'](context['r'], context['0'], context['dx6']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['y1'])} ${lineTo(
                            context,
                            context['ssd32'],
                            context['y1']
                        )} ${lineTo(context, context['ssd32'], context['y2'])} ${lineTo(
                            context,
                            context['l'],
                            context['y2']
                        )} ${close(context)} ${moveTo(
                            context,
                            context['ssd16'],
                            context['y1']
                        )} ${lineTo(context, context['ssd8'], context['y1'])} ${lineTo(
                            context,
                            context['ssd8'],
                            context['y2']
                        )} ${lineTo(context, context['ssd16'], context['y2'])} ${close(
                            context
                        )} ${moveTo(context, context['x4'], context['y1'])} ${lineTo(
                            context,
                            context['x5'],
                            context['y1']
                        )} ${lineTo(context, context['x5'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['vc']
                        )} ${lineTo(context, context['x5'], context['b'])} ${lineTo(
                            context,
                            context['x5'],
                            context['y2']
                        )} ${lineTo(context, context['x4'], context['y2'])} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.SUN]: {
        editable: true,
        defaultValue: [25000],
        defaultKey: ['adj'],
        formula: (width: number, height: number, [adj]: number[]) => {
            const context = getContext(width, height);
            context['adj'] = adj;

            context['a'] = Formula['pin'](context['12500'], context['adj'], context['46875']);
            context['g0'] = Formula['+-'](context['50000'], context['0'], context['a']);
            context['g1'] = Formula['*/'](context['g0'], context['30274'], context['32768']);
            context['g2'] = Formula['*/'](context['g0'], context['12540'], context['32768']);
            context['g3'] = Formula['+-'](context['g1'], context['50000'], context['0']);
            context['g4'] = Formula['+-'](context['g2'], context['50000'], context['0']);
            context['g5'] = Formula['+-'](context['50000'], context['0'], context['g1']);
            context['g6'] = Formula['+-'](context['50000'], context['0'], context['g2']);
            context['g7'] = Formula['*/'](context['g0'], context['23170'], context['32768']);
            context['g8'] = Formula['+-'](context['50000'], context['g7'], context['0']);
            context['g9'] = Formula['+-'](context['50000'], context['0'], context['g7']);
            context['g10'] = Formula['*/'](context['g5'], context['3'], context['4']);
            context['g11'] = Formula['*/'](context['g6'], context['3'], context['4']);
            context['g12'] = Formula['+-'](context['g10'], context['3662'], context['0']);
            context['g13'] = Formula['+-'](context['g11'], context['3662'], context['0']);
            context['g14'] = Formula['+-'](context['g11'], context['12500'], context['0']);
            context['g15'] = Formula['+-'](context['100000'], context['0'], context['g10']);
            context['g16'] = Formula['+-'](context['100000'], context['0'], context['g12']);
            context['g17'] = Formula['+-'](context['100000'], context['0'], context['g13']);
            context['g18'] = Formula['+-'](context['100000'], context['0'], context['g14']);
            context['ox1'] = Formula['*/'](context['w'], context['18436'], context['21600']);
            context['oy1'] = Formula['*/'](context['h'], context['3163'], context['21600']);
            context['ox2'] = Formula['*/'](context['w'], context['3163'], context['21600']);
            context['oy2'] = Formula['*/'](context['h'], context['18436'], context['21600']);
            context['x8'] = Formula['*/'](context['w'], context['g8'], context['100000']);
            context['x9'] = Formula['*/'](context['w'], context['g9'], context['100000']);
            context['x10'] = Formula['*/'](context['w'], context['g10'], context['100000']);
            context['x12'] = Formula['*/'](context['w'], context['g12'], context['100000']);
            context['x13'] = Formula['*/'](context['w'], context['g13'], context['100000']);
            context['x14'] = Formula['*/'](context['w'], context['g14'], context['100000']);
            context['x15'] = Formula['*/'](context['w'], context['g15'], context['100000']);
            context['x16'] = Formula['*/'](context['w'], context['g16'], context['100000']);
            context['x17'] = Formula['*/'](context['w'], context['g17'], context['100000']);
            context['x18'] = Formula['*/'](context['w'], context['g18'], context['100000']);
            context['x19'] = Formula['*/'](context['w'], context['a'], context['100000']);
            context['wR'] = Formula['*/'](context['w'], context['g0'], context['100000']);
            context['hR'] = Formula['*/'](context['h'], context['g0'], context['100000']);
            context['y8'] = Formula['*/'](context['h'], context['g8'], context['100000']);
            context['y9'] = Formula['*/'](context['h'], context['g9'], context['100000']);
            context['y10'] = Formula['*/'](context['h'], context['g10'], context['100000']);
            context['y12'] = Formula['*/'](context['h'], context['g12'], context['100000']);
            context['y13'] = Formula['*/'](context['h'], context['g13'], context['100000']);
            context['y14'] = Formula['*/'](context['h'], context['g14'], context['100000']);
            context['y15'] = Formula['*/'](context['h'], context['g15'], context['100000']);
            context['y16'] = Formula['*/'](context['h'], context['g16'], context['100000']);
            context['y17'] = Formula['*/'](context['h'], context['g17'], context['100000']);
            context['y18'] = Formula['*/'](context['h'], context['g18'], context['100000']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['r'], context['vc'])} ${lineTo(
                            context,
                            context['x15'],
                            context['y18']
                        )} ${lineTo(context, context['x15'], context['y14'])} ${close(
                            context
                        )} ${moveTo(context, context['ox1'], context['oy1'])} ${lineTo(
                            context,
                            context['x16'],
                            context['y13']
                        )} ${lineTo(context, context['x17'], context['y12'])} ${close(
                            context
                        )} ${moveTo(context, context['hc'], context['t'])} ${lineTo(
                            context,
                            context['x18'],
                            context['y10']
                        )} ${lineTo(context, context['x14'], context['y10'])} ${close(
                            context
                        )} ${moveTo(context, context['ox2'], context['oy1'])} ${lineTo(
                            context,
                            context['x13'],
                            context['y12']
                        )} ${lineTo(context, context['x12'], context['y13'])} ${close(
                            context
                        )} ${moveTo(context, context['l'], context['vc'])} ${lineTo(
                            context,
                            context['x10'],
                            context['y14']
                        )} ${lineTo(context, context['x10'], context['y18'])} ${close(
                            context
                        )} ${moveTo(context, context['ox2'], context['oy2'])} ${lineTo(
                            context,
                            context['x12'],
                            context['y17']
                        )} ${lineTo(context, context['x13'], context['y16'])} ${close(
                            context
                        )} ${moveTo(context, context['hc'], context['b'])} ${lineTo(
                            context,
                            context['x14'],
                            context['y15']
                        )} ${lineTo(context, context['x18'], context['y15'])} ${close(
                            context
                        )} ${moveTo(context, context['ox1'], context['oy2'])} ${lineTo(
                            context,
                            context['x17'],
                            context['y16']
                        )} ${lineTo(context, context['x16'], context['y17'])} ${close(
                            context
                        )} ${moveTo(context, context['x19'], context['vc'])} ${arcTo(
                            context,
                            context['wR'],
                            context['hR'],
                            context['cd2'],
                            context['21600000']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.SWOOSH_ARROW]: {
        editable: true,
        defaultValue: [25000, 16667],
        defaultKey: ['adj1', 'adj2'],
        formula: (width: number, height: number, [adj1, adj2]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;

            context['a1'] = Formula['pin'](context['1'], context['adj1'], context['75000']);
            context['maxAdj2'] = Formula['*/'](context['70000'], context['w'], context['ss']);
            context['a2'] = Formula['pin'](context['0'], context['adj2'], context['maxAdj2']);
            context['ad1'] = Formula['*/'](context['h'], context['a1'], context['100000']);
            context['ad2'] = Formula['*/'](context['ss'], context['a2'], context['100000']);
            context['xB'] = Formula['+-'](context['r'], context['0'], context['ad2']);
            context['yB'] = Formula['+-'](context['t'], context['ssd8'], context['0']);
            context['alfa'] = Formula['*/'](context['cd4'], context['1'], context['14']);
            context['dx0'] = Formula['tan'](context['ssd8'], context['alfa']);
            context['xC'] = Formula['+-'](context['xB'], context['0'], context['dx0']);
            context['dx1'] = Formula['tan'](context['ad1'], context['alfa']);
            context['yF'] = Formula['+-'](context['yB'], context['ad1'], context['0']);
            context['xF'] = Formula['+-'](context['xB'], context['dx1'], context['0']);
            context['xE'] = Formula['+-'](context['xF'], context['dx0'], context['0']);
            context['yE'] = Formula['+-'](context['yF'], context['ssd8'], context['0']);
            context['dy2'] = Formula['+-'](context['yE'], context['0'], context['t']);
            context['dy22'] = Formula['*/'](context['dy2'], context['1'], context['2']);
            context['dy3'] = Formula['*/'](context['h'], context['1'], context['20']);
            context['yD'] = Formula['+-'](context['t'], context['dy22'], context['dy3']);
            context['dy4'] = Formula['*/'](context['hd6'], context['1'], context['1']);
            context['yP1'] = Formula['+-'](context['hd6'], context['dy4'], context['0']);
            context['xP1'] = Formula['val'](context['wd6']);
            context['dy5'] = Formula['*/'](context['hd6'], context['1'], context['2']);
            context['yP2'] = Formula['+-'](context['yF'], context['dy5'], context['0']);
            context['xP2'] = Formula['val'](context['wd4']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['b'])} ${quadBezTo(
                            context,
                            context['xP1'],
                            context['yP1'],
                            context['xB'],
                            context['yB']
                        )} ${lineTo(context, context['xC'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['yD']
                        )} ${lineTo(context, context['xE'], context['yE'])} ${lineTo(
                            context,
                            context['xF'],
                            context['yF']
                        )} ${quadBezTo(
                            context,
                            context['xP2'],
                            context['yP2'],
                            context['l'],
                            context['b']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.TEARDROP]: {
        editable: true,
        defaultValue: [100000],
        defaultKey: ['adj'],
        formula: (width: number, height: number, [adj]: number[]) => {
            const context = getContext(width, height);
            context['adj'] = adj;

            context['a'] = Formula['pin'](context['0'], context['adj'], context['200000']);
            context['r2'] = Formula['sqrt'](context['2']);
            context['tw'] = Formula['*/'](context['wd2'], context['r2'], context['1']);
            context['th'] = Formula['*/'](context['hd2'], context['r2'], context['1']);
            context['sw'] = Formula['*/'](context['tw'], context['a'], context['100000']);
            context['sh'] = Formula['*/'](context['th'], context['a'], context['100000']);
            context['dx1'] = Formula['cos'](context['sw'], context['2700000']);
            context['dy1'] = Formula['sin'](context['sh'], context['2700000']);
            context['x1'] = Formula['+-'](context['hc'], context['dx1'], context['0']);
            context['y1'] = Formula['+-'](context['vc'], context['0'], context['dy1']);
            context['x2'] = Formula['+/'](context['hc'], context['x1'], context['2']);
            context['y2'] = Formula['+/'](context['vc'], context['y1'], context['2']);
            context['idx'] = Formula['cos'](context['wd2'], context['2700000']);
            context['idy'] = Formula['sin'](context['hd2'], context['2700000']);
            context['il'] = Formula['+-'](context['hc'], context['0'], context['idx']);
            context['ir'] = Formula['+-'](context['hc'], context['idx'], context['0']);
            context['it'] = Formula['+-'](context['vc'], context['0'], context['idy']);
            context['ib'] = Formula['+-'](context['vc'], context['idy'], context['0']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['vc'])} ${arcTo(
                            context,
                            context['wd2'],
                            context['hd2'],
                            context['cd2'],
                            context['cd4']
                        )} ${quadBezTo(
                            context,
                            context['x2'],
                            context['t'],
                            context['x1'],
                            context['y1']
                        )} ${quadBezTo(
                            context,
                            context['r'],
                            context['y2'],
                            context['r'],
                            context['vc']
                        )} ${arcTo(
                            context,
                            context['wd2'],
                            context['hd2'],
                            context['0'],
                            context['cd4']
                        )} ${arcTo(
                            context,
                            context['wd2'],
                            context['hd2'],
                            context['cd4'],
                            context['cd4']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.TRAPEZOID]: {
        editable: true,
        defaultValue: [25000],
        defaultKey: ['adj'],
        formula: (width: number, height: number, [adj]: number[]) => {
            const context = getContext(width, height);
            context['adj'] = adj;

            context['maxAdj'] = Formula['*/'](context['50000'], context['w'], context['ss']);
            context['a'] = Formula['pin'](context['0'], context['adj'], context['maxAdj']);
            context['x1'] = Formula['*/'](context['ss'], context['a'], context['200000']);
            context['x2'] = Formula['*/'](context['ss'], context['a'], context['100000']);
            context['x3'] = Formula['+-'](context['r'], context['0'], context['x2']);
            context['x4'] = Formula['+-'](context['r'], context['0'], context['x1']);
            context['il'] = Formula['*/'](context['wd3'], context['a'], context['maxAdj']);
            context['it'] = Formula['*/'](context['hd3'], context['a'], context['maxAdj']);
            context['ir'] = Formula['+-'](context['r'], context['0'], context['il']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['b'])} ${lineTo(
                            context,
                            context['x2'],
                            context['t']
                        )} ${lineTo(context, context['x3'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['b']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.TRIANGLE]: {
        editable: true,
        defaultValue: [50000],
        defaultKey: ['adj'],
        formula: (width: number, height: number, [adj]: number[]) => {
            const context = getContext(width, height);
            context['adj'] = adj;

            context['a'] = Formula['pin'](context['0'], context['adj'], context['100000']);
            context['x1'] = Formula['*/'](context['w'], context['a'], context['200000']);
            context['x2'] = Formula['*/'](context['w'], context['a'], context['100000']);
            context['x3'] = Formula['+-'](context['x1'], context['wd2'], context['0']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['b'])} ${lineTo(
                            context,
                            context['x2'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['b'])} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.UP_ARROW_CALLOUT]: {
        editable: true,
        defaultValue: [25000, 25000, 25000, 64977],
        defaultKey: ['adj1', 'adj2', 'adj3', 'adj4'],
        formula: (width: number, height: number, [adj1, adj2, adj3, adj4]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;
            context['adj3'] = adj3;
            context['adj4'] = adj4;

            context['maxAdj2'] = Formula['*/'](context['50000'], context['w'], context['ss']);
            context['a2'] = Formula['pin'](context['0'], context['adj2'], context['maxAdj2']);
            context['maxAdj1'] = Formula['*/'](context['a2'], context['2'], context['1']);
            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['maxAdj1']);
            context['maxAdj3'] = Formula['*/'](context['100000'], context['h'], context['ss']);
            context['a3'] = Formula['pin'](context['0'], context['adj3'], context['maxAdj3']);
            context['q2'] = Formula['*/'](context['a3'], context['ss'], context['h']);
            context['maxAdj4'] = Formula['+-'](context['100000'], context['0'], context['q2']);
            context['a4'] = Formula['pin'](context['0'], context['adj4'], context['maxAdj4']);
            context['dx1'] = Formula['*/'](context['ss'], context['a2'], context['100000']);
            context['dx2'] = Formula['*/'](context['ss'], context['a1'], context['200000']);
            context['x1'] = Formula['+-'](context['hc'], context['0'], context['dx1']);
            context['x2'] = Formula['+-'](context['hc'], context['0'], context['dx2']);
            context['x3'] = Formula['+-'](context['hc'], context['dx2'], context['0']);
            context['x4'] = Formula['+-'](context['hc'], context['dx1'], context['0']);
            context['y1'] = Formula['*/'](context['ss'], context['a3'], context['100000']);
            context['dy2'] = Formula['*/'](context['h'], context['a4'], context['100000']);
            context['y2'] = Formula['+-'](context['b'], context['0'], context['dy2']);
            context['y3'] = Formula['+/'](context['y2'], context['b'], context['2']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['y2'])} ${lineTo(
                            context,
                            context['x2'],
                            context['y2']
                        )} ${lineTo(context, context['x2'], context['y1'])} ${lineTo(
                            context,
                            context['x1'],
                            context['y1']
                        )} ${lineTo(context, context['hc'], context['t'])} ${lineTo(
                            context,
                            context['x4'],
                            context['y1']
                        )} ${lineTo(context, context['x3'], context['y1'])} ${lineTo(
                            context,
                            context['x3'],
                            context['y2']
                        )} ${lineTo(context, context['r'], context['y2'])} ${lineTo(
                            context,
                            context['r'],
                            context['b']
                        )} ${lineTo(context, context['l'], context['b'])} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.UP_DOWN_ARROW]: {
        editable: true,
        defaultValue: [50000, 50000],
        defaultKey: ['adj1', 'adj2'],
        formula: (width: number, height: number, [adj1, adj2]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;

            context['maxAdj2'] = Formula['*/'](context['50000'], context['h'], context['ss']);
            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['100000']);
            context['a2'] = Formula['pin'](context['0'], context['adj2'], context['maxAdj2']);
            context['y2'] = Formula['*/'](context['ss'], context['a2'], context['100000']);
            context['y3'] = Formula['+-'](context['b'], context['0'], context['y2']);
            context['dx1'] = Formula['*/'](context['w'], context['a1'], context['200000']);
            context['x1'] = Formula['+-'](context['hc'], context['0'], context['dx1']);
            context['x2'] = Formula['+-'](context['hc'], context['dx1'], context['0']);
            context['dy1'] = Formula['*/'](context['x1'], context['y2'], context['wd2']);
            context['y1'] = Formula['+-'](context['y2'], context['0'], context['dy1']);
            context['y4'] = Formula['+-'](context['y3'], context['dy1'], context['0']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['y2'])} ${lineTo(
                            context,
                            context['hc'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['y2'])} ${lineTo(
                            context,
                            context['x2'],
                            context['y2']
                        )} ${lineTo(context, context['x2'], context['y3'])} ${lineTo(
                            context,
                            context['r'],
                            context['y3']
                        )} ${lineTo(context, context['hc'], context['b'])} ${lineTo(
                            context,
                            context['l'],
                            context['y3']
                        )} ${lineTo(context, context['x1'], context['y3'])} ${lineTo(
                            context,
                            context['x1'],
                            context['y2']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.UP_ARROW]: {
        editable: true,
        defaultValue: [50000, 50000],
        defaultKey: ['adj1', 'adj2'],
        formula: (width: number, height: number, [adj1, adj2]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;

            context['maxAdj2'] = Formula['*/'](context['50000'], context['h'], context['ss']);
            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['100000']);
            context['a2'] = Formula['pin'](context['0'], context['adj2'], context['maxAdj2']);
            context['y2'] = Formula['*/'](context['ss'], context['a2'], context['100000']);
            context['dx1'] = Formula['*/'](context['w'], context['a1'], context['200000']);
            context['x1'] = Formula['+-'](context['hc'], context['0'], context['dx1']);
            context['x2'] = Formula['+-'](context['hc'], context['dx1'], context['0']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['y2'])} ${lineTo(
                            context,
                            context['hc'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['y2'])} ${lineTo(
                            context,
                            context['x2'],
                            context['y2']
                        )} ${lineTo(context, context['x2'], context['b'])} ${lineTo(
                            context,
                            context['x1'],
                            context['b']
                        )} ${lineTo(context, context['x1'], context['y2'])} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.UP_DOWN_ARROW_CALLOUT]: {
        editable: true,
        defaultValue: [25000, 25000, 25000, 48123],
        defaultKey: ['adj1', 'adj2', 'adj3', 'adj4'],
        formula: (width: number, height: number, [adj1, adj2, adj3, adj4]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;
            context['adj3'] = adj3;
            context['adj4'] = adj4;

            context['maxAdj2'] = Formula['*/'](context['50000'], context['w'], context['ss']);
            context['a2'] = Formula['pin'](context['0'], context['adj2'], context['maxAdj2']);
            context['maxAdj1'] = Formula['*/'](context['a2'], context['2'], context['1']);
            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['maxAdj1']);
            context['maxAdj3'] = Formula['*/'](context['50000'], context['h'], context['ss']);
            context['a3'] = Formula['pin'](context['0'], context['adj3'], context['maxAdj3']);
            context['q2'] = Formula['*/'](context['a3'], context['ss'], context['hd2']);
            context['maxAdj4'] = Formula['+-'](context['100000'], context['0'], context['q2']);
            context['a4'] = Formula['pin'](context['0'], context['adj4'], context['maxAdj4']);
            context['dx1'] = Formula['*/'](context['ss'], context['a2'], context['100000']);
            context['dx2'] = Formula['*/'](context['ss'], context['a1'], context['200000']);
            context['x1'] = Formula['+-'](context['hc'], context['0'], context['dx1']);
            context['x2'] = Formula['+-'](context['hc'], context['0'], context['dx2']);
            context['x3'] = Formula['+-'](context['hc'], context['dx2'], context['0']);
            context['x4'] = Formula['+-'](context['hc'], context['dx1'], context['0']);
            context['y1'] = Formula['*/'](context['ss'], context['a3'], context['100000']);
            context['y4'] = Formula['+-'](context['b'], context['0'], context['y1']);
            context['dy2'] = Formula['*/'](context['h'], context['a4'], context['200000']);
            context['y2'] = Formula['+-'](context['vc'], context['0'], context['dy2']);
            context['y3'] = Formula['+-'](context['vc'], context['dy2'], context['0']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['y2'])} ${lineTo(
                            context,
                            context['x2'],
                            context['y2']
                        )} ${lineTo(context, context['x2'], context['y1'])} ${lineTo(
                            context,
                            context['x1'],
                            context['y1']
                        )} ${lineTo(context, context['hc'], context['t'])} ${lineTo(
                            context,
                            context['x4'],
                            context['y1']
                        )} ${lineTo(context, context['x3'], context['y1'])} ${lineTo(
                            context,
                            context['x3'],
                            context['y2']
                        )} ${lineTo(context, context['r'], context['y2'])} ${lineTo(
                            context,
                            context['r'],
                            context['y3']
                        )} ${lineTo(context, context['x3'], context['y3'])} ${lineTo(
                            context,
                            context['x3'],
                            context['y4']
                        )} ${lineTo(context, context['x4'], context['y4'])} ${lineTo(
                            context,
                            context['hc'],
                            context['b']
                        )} ${lineTo(context, context['x1'], context['y4'])} ${lineTo(
                            context,
                            context['x2'],
                            context['y4']
                        )} ${lineTo(context, context['x2'], context['y3'])} ${lineTo(
                            context,
                            context['l'],
                            context['y3']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.UTURN_ARROW]: {
        editable: true,
        defaultValue: [25000, 25000, 25000, 43750, 75000],
        defaultKey: ['adj1', 'adj2', 'adj3', 'adj4', 'adj5'],
        formula: (width: number, height: number, [adj1, adj2, adj3, adj4, adj5]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;
            context['adj3'] = adj3;
            context['adj4'] = adj4;
            context['adj5'] = adj5;

            context['a2'] = Formula['pin'](context['0'], context['adj2'], context['25000']);
            context['maxAdj1'] = Formula['*/'](context['a2'], context['2'], context['1']);
            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['maxAdj1']);
            context['q2'] = Formula['*/'](context['a1'], context['ss'], context['h']);
            context['q3'] = Formula['+-'](context['100000'], context['0'], context['q2']);
            context['maxAdj3'] = Formula['*/'](context['q3'], context['h'], context['ss']);
            context['a3'] = Formula['pin'](context['0'], context['adj3'], context['maxAdj3']);
            context['q1'] = Formula['+-'](context['a3'], context['a1'], context['0']);
            context['minAdj5'] = Formula['*/'](context['q1'], context['ss'], context['h']);
            context['a5'] = Formula['pin'](context['minAdj5'], context['adj5'], context['100000']);
            context['th'] = Formula['*/'](context['ss'], context['a1'], context['100000']);
            context['aw2'] = Formula['*/'](context['ss'], context['a2'], context['100000']);
            context['th2'] = Formula['*/'](context['th'], context['1'], context['2']);
            context['dh2'] = Formula['+-'](context['aw2'], context['0'], context['th2']);
            context['y5'] = Formula['*/'](context['h'], context['a5'], context['100000']);
            context['ah'] = Formula['*/'](context['ss'], context['a3'], context['100000']);
            context['y4'] = Formula['+-'](context['y5'], context['0'], context['ah']);
            context['x9'] = Formula['+-'](context['r'], context['0'], context['dh2']);
            context['bw'] = Formula['*/'](context['x9'], context['1'], context['2']);
            context['bs'] = Formula['min'](context['bw'], context['y4']);
            context['maxAdj4'] = Formula['*/'](context['bs'], context['100000'], context['ss']);
            context['a4'] = Formula['pin'](context['0'], context['adj4'], context['maxAdj4']);
            context['bd'] = Formula['*/'](context['ss'], context['a4'], context['100000']);
            context['bd3'] = Formula['+-'](context['bd'], context['0'], context['th']);
            context['bd2'] = Formula['max'](context['bd3'], context['0']);
            context['x3'] = Formula['+-'](context['th'], context['bd2'], context['0']);
            context['x8'] = Formula['+-'](context['r'], context['0'], context['aw2']);
            context['x6'] = Formula['+-'](context['x8'], context['0'], context['aw2']);
            context['x7'] = Formula['+-'](context['x6'], context['dh2'], context['0']);
            context['x4'] = Formula['+-'](context['x9'], context['0'], context['bd']);
            context['x5'] = Formula['+-'](context['x7'], context['0'], context['bd2']);
            context['cx'] = Formula['+/'](context['th'], context['x7'], context['2']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['b'])} ${lineTo(
                            context,
                            context['l'],
                            context['bd']
                        )} ${arcTo(
                            context,
                            context['bd'],
                            context['bd'],
                            context['cd2'],
                            context['cd4']
                        )} ${lineTo(context, context['x4'], context['t'])} ${arcTo(
                            context,
                            context['bd'],
                            context['bd'],
                            context['3cd4'],
                            context['cd4']
                        )} ${lineTo(context, context['x9'], context['y4'])} ${lineTo(
                            context,
                            context['r'],
                            context['y4']
                        )} ${lineTo(context, context['x8'], context['y5'])} ${lineTo(
                            context,
                            context['x6'],
                            context['y4']
                        )} ${lineTo(context, context['x7'], context['y4'])} ${lineTo(
                            context,
                            context['x7'],
                            context['x3']
                        )} ${arcTo(
                            context,
                            context['bd2'],
                            context['bd2'],
                            context['0'],
                            context['-5400000']
                        )} ${lineTo(context, context['x3'], context['th'])} ${arcTo(
                            context,
                            context['bd2'],
                            context['bd2'],
                            context['3cd4'],
                            context['-5400000']
                        )} ${lineTo(context, context['th'], context['b'])} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.VERTICAL_SCROLL]: {
        editable: true,
        defaultValue: [12500],
        defaultKey: ['adj'],
        formula: (width: number, height: number, [adj]: number[]) => {
            const context = getContext(width, height);
            context['adj'] = adj;

            context['a'] = Formula['pin'](context['0'], context['adj'], context['25000']);
            context['ch'] = Formula['*/'](context['ss'], context['a'], context['100000']);
            context['ch2'] = Formula['*/'](context['ch'], context['1'], context['2']);
            context['ch4'] = Formula['*/'](context['ch'], context['1'], context['4']);
            context['x3'] = Formula['+-'](context['ch'], context['ch2'], context['0']);
            context['x4'] = Formula['+-'](context['ch'], context['ch'], context['0']);
            context['x6'] = Formula['+-'](context['r'], context['0'], context['ch']);
            context['x7'] = Formula['+-'](context['r'], context['0'], context['ch2']);
            context['x5'] = Formula['+-'](context['x6'], context['0'], context['ch2']);
            context['y3'] = Formula['+-'](context['b'], context['0'], context['ch']);
            context['y4'] = Formula['+-'](context['b'], context['0'], context['ch2']);

            return [
                {
                    d: path(context, { stroke: 'false', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['ch2'], context['b'])} ${arcTo(
                            context,
                            context['ch2'],
                            context['ch2'],
                            context['cd4'],
                            context['-5400000']
                        )} ${lineTo(context, context['ch2'], context['y4'])} ${arcTo(
                            context,
                            context['ch4'],
                            context['ch4'],
                            context['cd4'],
                            context['-10800000']
                        )} ${lineTo(context, context['ch'], context['y3'])} ${lineTo(
                            context,
                            context['ch'],
                            context['ch2']
                        )} ${arcTo(
                            context,
                            context['ch2'],
                            context['ch2'],
                            context['cd2'],
                            context['cd4']
                        )} ${lineTo(context, context['x7'], context['t'])} ${arcTo(
                            context,
                            context['ch2'],
                            context['ch2'],
                            context['3cd4'],
                            context['cd2']
                        )} ${lineTo(context, context['x6'], context['ch'])} ${lineTo(
                            context,
                            context['x6'],
                            context['y4']
                        )} ${arcTo(
                            context,
                            context['ch2'],
                            context['ch2'],
                            context['0'],
                            context['cd4']
                        )} ${close(context)} ${moveTo(
                            context,
                            context['x4'],
                            context['ch2']
                        )} ${arcTo(
                            context,
                            context['ch2'],
                            context['ch2'],
                            context['0'],
                            context['cd4']
                        )} ${arcTo(
                            context,
                            context['ch4'],
                            context['ch4'],
                            context['cd4'],
                            context['cd2']
                        )} ${close(context)}`;
                    }),
                    attrs: { stroke: 'false', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(
                        context,
                        { fill: 'darkenLess', stroke: 'false', extrusionOk: 'false' },
                        () => {
                            return `${moveTo(context, context['x4'], context['ch2'])} ${arcTo(
                                context,
                                context['ch2'],
                                context['ch2'],
                                context['0'],
                                context['cd4']
                            )} ${arcTo(
                                context,
                                context['ch4'],
                                context['ch4'],
                                context['cd4'],
                                context['cd2']
                            )} ${close(context)} ${moveTo(
                                context,
                                context['ch'],
                                context['y4']
                            )} ${arcTo(
                                context,
                                context['ch2'],
                                context['ch2'],
                                context['0'],
                                context['3cd4']
                            )} ${arcTo(
                                context,
                                context['ch4'],
                                context['ch4'],
                                context['3cd4'],
                                context['cd2']
                            )} ${close(context)}`;
                        }
                    ),
                    attrs: { fill: 'darkenLess', stroke: 'false', extrusionOk: 'false' },
                    context,
                },
                {
                    d: path(context, { fill: 'none', extrusionOk: 'false' }, () => {
                        return `${moveTo(context, context['ch'], context['y3'])} ${lineTo(
                            context,
                            context['ch'],
                            context['ch2']
                        )} ${arcTo(
                            context,
                            context['ch2'],
                            context['ch2'],
                            context['cd2'],
                            context['cd4']
                        )} ${lineTo(context, context['x7'], context['t'])} ${arcTo(
                            context,
                            context['ch2'],
                            context['ch2'],
                            context['3cd4'],
                            context['cd2']
                        )} ${lineTo(context, context['x6'], context['ch'])} ${lineTo(
                            context,
                            context['x6'],
                            context['y4']
                        )} ${arcTo(
                            context,
                            context['ch2'],
                            context['ch2'],
                            context['0'],
                            context['cd4']
                        )} ${lineTo(context, context['ch2'], context['b'])} ${arcTo(
                            context,
                            context['ch2'],
                            context['ch2'],
                            context['cd4'],
                            context['cd2']
                        )} ${close(context)} ${moveTo(
                            context,
                            context['x3'],
                            context['t']
                        )} ${arcTo(
                            context,
                            context['ch2'],
                            context['ch2'],
                            context['3cd4'],
                            context['cd2']
                        )} ${arcTo(
                            context,
                            context['ch4'],
                            context['ch4'],
                            context['cd4'],
                            context['cd2']
                        )} ${lineTo(context, context['x4'], context['ch2'])} ${moveTo(
                            context,
                            context['x6'],
                            context['ch']
                        )} ${lineTo(context, context['x3'], context['ch'])} ${moveTo(
                            context,
                            context['ch2'],
                            context['y3']
                        )} ${arcTo(
                            context,
                            context['ch4'],
                            context['ch4'],
                            context['3cd4'],
                            context['cd2']
                        )} ${lineTo(context, context['ch'], context['y4'])} ${moveTo(
                            context,
                            context['ch2'],
                            context['b']
                        )} ${arcTo(
                            context,
                            context['ch2'],
                            context['ch2'],
                            context['cd4'],
                            context['-5400000']
                        )} ${lineTo(context, context['ch'], context['y3'])}`;
                    }),
                    attrs: { fill: 'none', extrusionOk: 'false' },
                    context,
                },
            ];
        },
    },
    [PresetShapeType.WAVE]: {
        editable: true,
        defaultValue: [12500, 0],
        defaultKey: ['adj1', 'adj2'],
        formula: (width: number, height: number, [adj1, adj2]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;

            context['a1'] = Formula['pin'](context['0'], context['adj1'], context['20000']);
            context['a2'] = Formula['pin'](context['-10000'], context['adj2'], context['10000']);
            context['y1'] = Formula['*/'](context['h'], context['a1'], context['100000']);
            context['dy2'] = Formula['*/'](context['y1'], context['10'], context['3']);
            context['y2'] = Formula['+-'](context['y1'], context['0'], context['dy2']);
            context['y3'] = Formula['+-'](context['y1'], context['dy2'], context['0']);
            context['y4'] = Formula['+-'](context['b'], context['0'], context['y1']);
            context['y5'] = Formula['+-'](context['y4'], context['0'], context['dy2']);
            context['y6'] = Formula['+-'](context['y4'], context['dy2'], context['0']);
            context['dx1'] = Formula['*/'](context['w'], context['a2'], context['100000']);
            context['of2'] = Formula['*/'](context['w'], context['a2'], context['50000']);
            context['x1'] = Formula['abs'](context['dx1']);
            context['dx2'] = Formula['?:'](context['of2'], context['0'], context['of2']);
            context['x2'] = Formula['+-'](context['l'], context['0'], context['dx2']);
            context['dx5'] = Formula['?:'](context['of2'], context['of2'], context['0']);
            context['x5'] = Formula['+-'](context['r'], context['0'], context['dx5']);
            context['dx3'] = Formula['+/'](context['dx2'], context['x5'], context['3']);
            context['x3'] = Formula['+-'](context['x2'], context['dx3'], context['0']);
            context['x4'] = Formula['+/'](context['x3'], context['x5'], context['2']);
            context['x6'] = Formula['+-'](context['l'], context['dx5'], context['0']);
            context['x10'] = Formula['+-'](context['r'], context['dx2'], context['0']);
            context['x7'] = Formula['+-'](context['x6'], context['dx3'], context['0']);
            context['x8'] = Formula['+/'](context['x7'], context['x10'], context['2']);
            context['x9'] = Formula['+-'](context['r'], context['0'], context['x1']);
            context['xAdj'] = Formula['+-'](context['hc'], context['dx1'], context['0']);
            context['xAdj2'] = Formula['+-'](context['hc'], context['0'], context['dx1']);
            context['il'] = Formula['max'](context['x2'], context['x6']);
            context['ir'] = Formula['min'](context['x5'], context['x10']);
            context['it'] = Formula['*/'](context['h'], context['a1'], context['50000']);
            context['ib'] = Formula['+-'](context['b'], context['0'], context['it']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['x2'], context['y1'])} ${cubicBezTo(
                            context,
                            context['x3'],
                            context['y2'],
                            context['x4'],
                            context['y3'],
                            context['x5'],
                            context['y1']
                        )} ${lineTo(context, context['x10'], context['y4'])} ${cubicBezTo(
                            context,
                            context['x8'],
                            context['y6'],
                            context['x7'],
                            context['y5'],
                            context['x6'],
                            context['y4']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.WEDGE_ELLIPSE_CALLOUT]: {
        editable: true,
        defaultValue: [-20833, 62500],
        defaultKey: ['adj1', 'adj2'],
        formula: (width: number, height: number, [adj1, adj2]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;

            context['dxPos'] = Formula['*/'](context['w'], context['adj1'], context['100000']);
            context['dyPos'] = Formula['*/'](context['h'], context['adj2'], context['100000']);
            context['xPos'] = Formula['+-'](context['hc'], context['dxPos'], context['0']);
            context['yPos'] = Formula['+-'](context['vc'], context['dyPos'], context['0']);
            context['sdx'] = Formula['*/'](context['dxPos'], context['h'], context['1']);
            context['sdy'] = Formula['*/'](context['dyPos'], context['w'], context['1']);
            context['pang'] = Formula['at2'](context['sdx'], context['sdy']);
            context['stAng'] = Formula['+-'](context['pang'], context['660000'], context['0']);
            context['enAng'] = Formula['+-'](context['pang'], context['0'], context['660000']);
            context['dx1'] = Formula['cos'](context['wd2'], context['stAng']);
            context['dy1'] = Formula['sin'](context['hd2'], context['stAng']);
            context['x1'] = Formula['+-'](context['hc'], context['dx1'], context['0']);
            context['y1'] = Formula['+-'](context['vc'], context['dy1'], context['0']);
            context['dx2'] = Formula['cos'](context['wd2'], context['enAng']);
            context['dy2'] = Formula['sin'](context['hd2'], context['enAng']);
            context['x2'] = Formula['+-'](context['hc'], context['dx2'], context['0']);
            context['y2'] = Formula['+-'](context['vc'], context['dy2'], context['0']);
            context['stAng1'] = Formula['at2'](context['dx1'], context['dy1']);
            context['enAng1'] = Formula['at2'](context['dx2'], context['dy2']);
            context['swAng1'] = Formula['+-'](context['enAng1'], context['0'], context['stAng1']);
            context['swAng2'] = Formula['+-'](context['swAng1'], context['21600000'], context['0']);
            context['swAng'] = Formula['?:'](
                context['swAng1'],
                context['swAng1'],
                context['swAng2']
            );
            context['idx'] = Formula['cos'](context['wd2'], context['2700000']);
            context['idy'] = Formula['sin'](context['hd2'], context['2700000']);
            context['il'] = Formula['+-'](context['hc'], context['0'], context['idx']);
            context['ir'] = Formula['+-'](context['hc'], context['idx'], context['0']);
            context['it'] = Formula['+-'](context['vc'], context['0'], context['idy']);
            context['ib'] = Formula['+-'](context['vc'], context['idy'], context['0']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['xPos'], context['yPos'])} ${lineTo(
                            context,
                            context['x1'],
                            context['y1']
                        )} ${arcTo(
                            context,
                            context['wd2'],
                            context['hd2'],
                            context['stAng1'],
                            context['swAng']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.WEDGE_RECT_CALLOUT]: {
        editable: true,
        defaultValue: [-20833, 62500],
        defaultKey: ['adj1', 'adj2'],
        formula: (width: number, height: number, [adj1, adj2]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;

            context['dxPos'] = Formula['*/'](context['w'], context['adj1'], context['100000']);
            context['dyPos'] = Formula['*/'](context['h'], context['adj2'], context['100000']);
            context['xPos'] = Formula['+-'](context['hc'], context['dxPos'], context['0']);
            context['yPos'] = Formula['+-'](context['vc'], context['dyPos'], context['0']);
            context['dx'] = Formula['+-'](context['xPos'], context['0'], context['hc']);
            context['dy'] = Formula['+-'](context['yPos'], context['0'], context['vc']);
            context['dq'] = Formula['*/'](context['dxPos'], context['h'], context['w']);
            context['ady'] = Formula['abs'](context['dyPos']);
            context['adq'] = Formula['abs'](context['dq']);
            context['dz'] = Formula['+-'](context['ady'], context['0'], context['adq']);
            context['xg1'] = Formula['?:'](context['dxPos'], context['7'], context['2']);
            context['xg2'] = Formula['?:'](context['dxPos'], context['10'], context['5']);
            context['x1'] = Formula['*/'](context['w'], context['xg1'], context['12']);
            context['x2'] = Formula['*/'](context['w'], context['xg2'], context['12']);
            context['yg1'] = Formula['?:'](context['dyPos'], context['7'], context['2']);
            context['yg2'] = Formula['?:'](context['dyPos'], context['10'], context['5']);
            context['y1'] = Formula['*/'](context['h'], context['yg1'], context['12']);
            context['y2'] = Formula['*/'](context['h'], context['yg2'], context['12']);
            context['t1'] = Formula['?:'](context['dxPos'], context['l'], context['xPos']);
            context['xl'] = Formula['?:'](context['dz'], context['l'], context['t1']);
            context['t2'] = Formula['?:'](context['dyPos'], context['x1'], context['xPos']);
            context['xt'] = Formula['?:'](context['dz'], context['t2'], context['x1']);
            context['t3'] = Formula['?:'](context['dxPos'], context['xPos'], context['r']);
            context['xr'] = Formula['?:'](context['dz'], context['r'], context['t3']);
            context['t4'] = Formula['?:'](context['dyPos'], context['xPos'], context['x1']);
            context['xb'] = Formula['?:'](context['dz'], context['t4'], context['x1']);
            context['t5'] = Formula['?:'](context['dxPos'], context['y1'], context['yPos']);
            context['yl'] = Formula['?:'](context['dz'], context['y1'], context['t5']);
            context['t6'] = Formula['?:'](context['dyPos'], context['t'], context['yPos']);
            context['yt'] = Formula['?:'](context['dz'], context['t6'], context['t']);
            context['t7'] = Formula['?:'](context['dxPos'], context['yPos'], context['y1']);
            context['yr'] = Formula['?:'](context['dz'], context['y1'], context['t7']);
            context['t8'] = Formula['?:'](context['dyPos'], context['yPos'], context['b']);
            context['yb'] = Formula['?:'](context['dz'], context['t8'], context['b']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['t'])} ${lineTo(
                            context,
                            context['x1'],
                            context['t']
                        )} ${lineTo(context, context['xt'], context['yt'])} ${lineTo(
                            context,
                            context['x2'],
                            context['t']
                        )} ${lineTo(context, context['r'], context['t'])} ${lineTo(
                            context,
                            context['r'],
                            context['y1']
                        )} ${lineTo(context, context['xr'], context['yr'])} ${lineTo(
                            context,
                            context['r'],
                            context['y2']
                        )} ${lineTo(context, context['r'], context['b'])} ${lineTo(
                            context,
                            context['x2'],
                            context['b']
                        )} ${lineTo(context, context['xb'], context['yb'])} ${lineTo(
                            context,
                            context['x1'],
                            context['b']
                        )} ${lineTo(context, context['l'], context['b'])} ${lineTo(
                            context,
                            context['l'],
                            context['y2']
                        )} ${lineTo(context, context['xl'], context['yl'])} ${lineTo(
                            context,
                            context['l'],
                            context['y1']
                        )} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
    [PresetShapeType.WEDGE_ROUND_RECT_CALLOUT]: {
        editable: true,
        defaultValue: [-20833, 62500, 16667],
        defaultKey: ['adj1', 'adj2', 'adj3'],
        formula: (width: number, height: number, [adj1, adj2, adj3]: number[]) => {
            const context = getContext(width, height);
            context['adj1'] = adj1;
            context['adj2'] = adj2;
            context['adj3'] = adj3;

            context['dxPos'] = Formula['*/'](context['w'], context['adj1'], context['100000']);
            context['dyPos'] = Formula['*/'](context['h'], context['adj2'], context['100000']);
            context['xPos'] = Formula['+-'](context['hc'], context['dxPos'], context['0']);
            context['yPos'] = Formula['+-'](context['vc'], context['dyPos'], context['0']);
            context['dq'] = Formula['*/'](context['dxPos'], context['h'], context['w']);
            context['ady'] = Formula['abs'](context['dyPos']);
            context['adq'] = Formula['abs'](context['dq']);
            context['dz'] = Formula['+-'](context['ady'], context['0'], context['adq']);
            context['xg1'] = Formula['?:'](context['dxPos'], context['7'], context['2']);
            context['xg2'] = Formula['?:'](context['dxPos'], context['10'], context['5']);
            context['x1'] = Formula['*/'](context['w'], context['xg1'], context['12']);
            context['x2'] = Formula['*/'](context['w'], context['xg2'], context['12']);
            context['yg1'] = Formula['?:'](context['dyPos'], context['7'], context['2']);
            context['yg2'] = Formula['?:'](context['dyPos'], context['10'], context['5']);
            context['y1'] = Formula['*/'](context['h'], context['yg1'], context['12']);
            context['y2'] = Formula['*/'](context['h'], context['yg2'], context['12']);
            context['t1'] = Formula['?:'](context['dxPos'], context['l'], context['xPos']);
            context['xl'] = Formula['?:'](context['dz'], context['l'], context['t1']);
            context['t2'] = Formula['?:'](context['dyPos'], context['x1'], context['xPos']);
            context['xt'] = Formula['?:'](context['dz'], context['t2'], context['x1']);
            context['t3'] = Formula['?:'](context['dxPos'], context['xPos'], context['r']);
            context['xr'] = Formula['?:'](context['dz'], context['r'], context['t3']);
            context['t4'] = Formula['?:'](context['dyPos'], context['xPos'], context['x1']);
            context['xb'] = Formula['?:'](context['dz'], context['t4'], context['x1']);
            context['t5'] = Formula['?:'](context['dxPos'], context['y1'], context['yPos']);
            context['yl'] = Formula['?:'](context['dz'], context['y1'], context['t5']);
            context['t6'] = Formula['?:'](context['dyPos'], context['t'], context['yPos']);
            context['yt'] = Formula['?:'](context['dz'], context['t6'], context['t']);
            context['t7'] = Formula['?:'](context['dxPos'], context['yPos'], context['y1']);
            context['yr'] = Formula['?:'](context['dz'], context['y1'], context['t7']);
            context['t8'] = Formula['?:'](context['dyPos'], context['yPos'], context['b']);
            context['yb'] = Formula['?:'](context['dz'], context['t8'], context['b']);
            context['u1'] = Formula['*/'](context['ss'], context['adj3'], context['100000']);
            context['u2'] = Formula['+-'](context['r'], context['0'], context['u1']);
            context['v2'] = Formula['+-'](context['b'], context['0'], context['u1']);
            context['il'] = Formula['*/'](context['u1'], context['29289'], context['100000']);
            context['ir'] = Formula['+-'](context['r'], context['0'], context['il']);
            context['ib'] = Formula['+-'](context['b'], context['0'], context['il']);

            return [
                {
                    d: path(context, {}, () => {
                        return `${moveTo(context, context['l'], context['u1'])} ${arcTo(
                            context,
                            context['u1'],
                            context['u1'],
                            context['cd2'],
                            context['cd4']
                        )} ${lineTo(context, context['x1'], context['t'])} ${lineTo(
                            context,
                            context['xt'],
                            context['yt']
                        )} ${lineTo(context, context['x2'], context['t'])} ${lineTo(
                            context,
                            context['u2'],
                            context['t']
                        )} ${arcTo(
                            context,
                            context['u1'],
                            context['u1'],
                            context['3cd4'],
                            context['cd4']
                        )} ${lineTo(context, context['r'], context['y1'])} ${lineTo(
                            context,
                            context['xr'],
                            context['yr']
                        )} ${lineTo(context, context['r'], context['y2'])} ${lineTo(
                            context,
                            context['r'],
                            context['v2']
                        )} ${arcTo(
                            context,
                            context['u1'],
                            context['u1'],
                            context['0'],
                            context['cd4']
                        )} ${lineTo(context, context['x2'], context['b'])} ${lineTo(
                            context,
                            context['xb'],
                            context['yb']
                        )} ${lineTo(context, context['x1'], context['b'])} ${lineTo(
                            context,
                            context['u1'],
                            context['b']
                        )} ${arcTo(
                            context,
                            context['u1'],
                            context['u1'],
                            context['cd4'],
                            context['cd4']
                        )} ${lineTo(context, context['l'], context['y2'])} ${lineTo(
                            context,
                            context['xl'],
                            context['yl']
                        )} ${lineTo(context, context['l'], context['y1'])} ${close(context)}`;
                    }),
                    attrs: {},
                    context,
                },
            ];
        },
    },
};
