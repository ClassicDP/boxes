class Point {
    constructor(
        public x: number,
        public y: number,
        public z: number
    ) {
    }

    copy() {
        return new Point(this.x, this.y, this.z)
    }

}

class Rect {


    get area() {
        return Math.abs((this.x2 - this.x1) * (this.y2 - this.y1))
    }

    constructor(
        public x1: number,
        public y1: number,
        public x2: number,
        public y2: number
    ) {
    }
}

class Segment {
    constructor(
        public a: number,
        public b: number
    ) {
    }

    get l() {
        return Math.abs(this.b - this.a)
    }
}

const rotate = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]]
const banRotatePercent = 15

type WHD = { width: number, height: number, depth: number }

class Box {
    b: WHD
    p?: Point
    rotateIndex: number = 0 // 0..5
    ambit: Point[]

    // 0:x, 1:y, 2:z
    segment3D(d: number): Segment | undefined {
        if (!this.p) return undefined
        d = rotate[this.rotateIndex][d]
        if (d == 0) return new Segment(this.p.x, this.p.x + this.b.width)
        if (d == 1) return new Segment(this.p.y, this.p.y + this.b.height)
        if (d == 2) return new Segment(this.p.z, this.p.z + this.b.depth)
    }

    base(): Rect | undefined {
        let x1 = this.segment3D(0)?.a
        let x2 = this.segment3D(0)?.b
        let y1 = this.segment3D(2)?.a
        let y2 = this.segment3D(2)?.b
        if (x1 == undefined || x2 == undefined || y1 == undefined || y2 == undefined) return undefined
        return new Rect(x1, x2, y1, y2)
    }

    isBaseOnBox(box: Box) {
        if (box.segment3D(1)?.a !== this.segment3D(1)?.b) return false
        return box.b.depth * box.b.width == this.b.depth * this.b.width
    }

    setAmbit() {
        this.ambit = []
        this.ambit.push(new Point(this.segment3D(0)!.a, this.segment3D(1)!.a, this.segment3D(2)!.a))
        this.ambit.push(new Point(this.segment3D(0)!.b, this.segment3D(1)!.b, this.segment3D(2)!.a))
        this.ambit.push(new Point(this.segment3D(0)!.a, this.segment3D(1)!.b, this.segment3D(2)!.b))
    }

    constructor(segments: Segment[] | WHD) {
        if (segments instanceof Array) {
            this.p = new Point(segments[0].a, segments[1].a, segments[2].a)
            this.b = {
                width: segments[0].b - segments[0].a,
                height: segments[1].b - segments[1].a,
                depth: segments[2].b - segments[2].a
            }
        } else {
            this.b = {width: segments.width, height: segments.height, depth: segments.depth}
        }
    }

    get V() {
        return this.b.width * this.b.height * this.b.depth
    }

    get maxArea() {
        return Math.max(this.b.height * this.b.width, this.b.height * this.b.depth, this.b.depth * this.b.width)
    }
}


function crossSegments(s1?: Segment, s2?: Segment): Segment | undefined {
    let z1, z2: Segment
    if (!s1 || !s2) return undefined
        ;
    [z1, z2] = (s1.a > s2.a) ? [s2, s1] : [s1, s2]
    if (z2.a <= z1.b) return new Segment(z2.a, Math.min(z1.b, z2.b))
    return undefined
}

function crossBoxes(b1: Box, b2: Box): Box | undefined {
    let newBox: Array<Segment> = []
    for (let i = 0; i < 3; i++) {
        let cross = crossSegments(b1.segment3D(i), b2.segment3D(i))
        if (!cross) return undefined
        newBox.push(cross)
    }
    return new Box(newBox)
}

function cmpRect(r1?: Rect, r2?: Rect) {
    if (!r1 || !r2) return false
    return r1.x1 == r2.x1 && r1.x2 == r2.x2 && r1.y1 == r2.y1 && r1.y2 == r2.y2
}

function cmpBox(b1?: Box, b2?: Box) {
    if (!b1 || !b2) return false
    if ((b1.p && !b2.p) || (!b1.b && b2.p)) return false
    if (b1.p && (b1.p.z !== b2.p?.z || b1.p.z !== b2.p?.z || b1.p.z !== b2.p?.z)) return false
    return !(b1.b.width !== b2.b.width || b1.b.height !== b2.b.height || b1.b.depth !== b2.b.depth)
}

class Order {
    fillIndex: number
    outsideCell: Box[] = []

    constructor(public boxList: Box[]) {
        this.sortByMaxArea()
    }

    putFirst(cell: Cell) {
        let area = 0
        let index = -1
        let box = this.boxList[0]
        if (!box) return false
        do {
            for (let i = 0; i < 6; i++) {
                box.rotateIndex = i
                if (area < (box.base()?.area ?? 0)) {
                    box.p = new Point(
                        cell.cellBox.segment3D(0)!.a,
                        cell.cellBox.segment3D(1)!.b - box.segment3D(1)!.l,
                        cell.cellBox.segment3D(2)!.a)
                    if (!cell.checkPlacing(box)) continue
                    area = (box.base()?.area ?? 0)
                    index = i
                }
            }
            if (index < 0) {
                let x = this.boxList.shift()
                if (x) this.outsideCell.push(x)
            }
        } while (index < 0 && this.boxList.length)
        if (index >= 0) {
            this.fillIndex = 0
            box.rotateIndex = index
            return true
        }
        return false
    }

    sortByMaxArea() {
        this.boxList.sort((a, b) => b.maxArea - a.maxArea)
    }

    sortByV() {
        this.boxList.sort((a, b) => b.V - a.V)
    }

}

class Cell {
    constructor(
        public cellBox: Box) {
    }

    checkPlacing(box: Box) {
        return cmpBox(box, crossBoxes(box, this.cellBox))
    }
}

let b1 = new Box({width: 10, height: 15, depth: 22})
let b2 = new Box({width: 10, height: 15, depth: 14})
b1.p = new Point(0,0,0)
b2.p = new Point(0,0,10)
b1.rotateIndex = 1
let cross = crossBoxes(b1, b2)
console.log(cross)
console.log()
