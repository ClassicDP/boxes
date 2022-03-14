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
const likePercent = 5

type WHD = { width: number, height: number, depth: number }
const dEnum: { [key in number | 'x' | 'y' | 'z']: number } = {"0": 0, "1": 1, "2": 2, "x": 0, "y": 1, "z": 2}

class Box {
    b: WHD
    p?: Point
    rotateIndex: number = 0 // 0..5
    ambit: Point[]


    // 0:x, 1:y, 2:z
    segment3D(d: number | 'x' | 'y' | 'z'): Segment {
        d = dEnum[d]
        d = rotate[this.rotateIndex][d]
        if (d == 0) return new Segment(this.p?.x ?? 0, (this.p?.x ?? 0) + this.b.width)
        if (d == 1) return new Segment(this.p?.y ?? 0, (this.p?.y ?? 0) + this.b.height)
        return new Segment(this.p?.z ?? 0, (this.p?.z ?? 0) + this.b.depth)
    }

    base(): Rect {
        let x1 = this.segment3D('x').a
        let x2 = this.segment3D('x').b
        let y1 = this.segment3D('z').a
        let y2 = this.segment3D('z').b
        return new Rect(x1, x2, y1, y2)
    }

    addVolume(box: Box) {
        let segments: Segment[] = []
        for (let i = 0; i < 3; i++) {
            segments.push(new Segment(Math.min(this.segment3D(i).a, box.segment3D(i).a),
                Math.max(this.segment3D(i).b, box.segment3D(i).b)))
        }
        return new Box(segments)
    }

    likeBox(box: Box) {
        for (let i = 0; i < 3; i++) if (this.segment3D(i).l / box.segment3D(i).l > likePercent / 100)
            return false
        return true
    }

    setAmbit(order: Order, space: number) {
        this.ambit = []
        // levels of support for put box
        let yList = [this.segment3D('y').b]
        for (let i = 0; i < order.fillIndex; i++) {
            yList.push(order.boxList[i].segment3D('y').b)
        }
        this.ambit.push(new Point(this.segment3D('x').a + space,
            this.segment3D('y').a,
            this.segment3D('z').a + space))
        yList.forEach((y) => {
            this.ambit.push(new Point(
                this.segment3D('x').b + space, y, this.segment3D('z').a + space))
            this.ambit.push(new Point(
                this.segment3D('x').a + space, y, this.segment3D('z').b + space))
        })
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

    copy() {
        if (this.p) return new Box([this.segment3D(0), this.segment3D(1), this.segment3D(2)])
        return new Box({
            width: this.b.width,
            height: this.b.height,
            depth: this.b.depth
        })
    }

    get V() {
        return this.b.width * this.b.height * this.b.depth
    }

    get maxArea() {
        return Math.max(
            this.b.height * this.b.width, this.b.height * this.b.depth, this.b.depth * this.b.width)
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


    sortByMaxArea() {
        this.boxList.sort((a, b) => b.maxArea - a.maxArea)
    }

    sortByV() {
        this.boxList.sort((a, b) => b.V - a.V)
    }

}

class Cell {
    constructor(
        public cellBox: Box, public spaces: number = 5) {
    }

    isBoxInside(box: Box) {
        // if box wholly in cell
        return crossBoxes(box, this.cellBox)?.V == box.V
    }

    isBoxSet(box: Box, order: Order) {
        let area = 0
        for (let i = 0; i < order.fillIndex; i++) {
            let crossBox = crossBoxes(box, order.boxList[i])
            if (crossBox?.V) return false
            if (crossBox && crossBox.segment3D('y').a == box.segment3D('y').b)
                area += crossBox.segment3D('x').l * crossBox.segment3D('z').l
        }
        // if box set on cell bottom
        if (box.segment3D('y')?.b == this.cellBox.segment3D('y')?.b) return true
        // 70% as sufficient support
        return area / (box.segment3D('x').l * box.segment3D('z').l) > 0.7;
    }

    putFirst(order: Order) {
        let area = 0
        let index = -1
        let box = order.boxList[0]
        if (!box) return false
        do {
            for (let i = 0; i < 6; i++) {
                box.rotateIndex = i
                if (area < box.base().area) {
                    box.p = new Point(this.cellBox.segment3D('x').a + this.spaces,
                        this.cellBox.segment3D('y').b - box.segment3D('y').l,
                        this.cellBox.segment3D('z').a + this.spaces)
                    if (!this.isBoxInside(box)) continue
                    area = box.base().area
                    index = i
                }
            }
            if (index < 0) {
                let x = order.boxList.shift()
                if (x) order.outsideCell.push(x)
            }
        } while (index < 0 && order.boxList.length)
        if (index >= 0) {
            order.fillIndex = 1
            box.rotateIndex = index
            return true
        }
        return false
    }

    distribute(order: Order) {
        this.putFirst(order)
        while (order.fillIndex < order.boxList.length) {
            let box = order.boxList[order.fillIndex]
            // rotation history
            let rHist: Box[] = []
            let success: Box[] = []
            for (let i = 0; i < 6; i++) {
                box.rotateIndex = i
                // check like in history
                let cont = false
                for (let b of rHist) {
                    cont = b.likeBox(box)
                    if (cont) break
                }
                if (cont) continue
                rHist.push(box.copy())
                box.setAmbit(order, this.spaces)
                box.ambit.forEach((p) => {
                    box.p = p
                    if (this.isBoxSet(box, order)) success.push(box.copy())
                })
            }
            // if received success placements
            if (success.length) {
                // select case with minimal total volume
                let vBox = order.boxList[0]
                for (let i = 1; i < order.fillIndex; i++) {
                    vBox.addVolume(order.boxList[i])
                }
                let volume = vBox.addVolume(success[0]).V
                let bestI = 0
                // search for min
                for (let i = 1; i < success.length; i++) {
                    let v = vBox.addVolume(success[i]).V
                    if (v < volume) {
                        volume = v
                        bestI = i
                    }
                }
                order.boxList[order.fillIndex++] = success[bestI]
            } else {
                order.outsideCell.push(order.boxList.splice(order.fillIndex, 1)[0])
            }
        }
    }

}

let b1 = new Box({width: 10, height: 15, depth: 22})
let b2 = new Box({width: 10, height: 15, depth: 14})
b1.p = new Point(0, 0, 0)
b2.p = new Point(0, 0, 10)
b1.rotateIndex = 1
let cross = crossBoxes(b1, b2)
console.log(cross)
console.log()
