'use strict';

class Vector {
  constructor(startX = 0, startY = 0) {
    this.x = startX;
    this.y = startY;
  }

  plus(vector) {
    if (!(vector instanceof Vector)) {
      throw new Error(`Аргумент не является экземпляром Vector`);
    }
    return new Vector(this.x + vector.x, this.y + vector.y);
  }

  times(mult) {
    return new Vector(this.x * mult, this.y * mult);
  }
}

class Actor {
  constructor(pos = new Vector(0, 0), size = new Vector(1, 1), speed = new Vector(0, 0)) {
    if (!(pos instanceof Vector && size instanceof Vector && speed instanceof Vector)) {
      throw new Error(`Аргумент не является экземпляром Vector`);
    }
    this.pos = pos;
    this.size = size;
    this.speed = speed;
    Object.defineProperty(this, 'left', {
      get: () => {
        return this.pos.x;
      }
    });
    Object.defineProperty(this, 'top', {
      get: () => {
        return this.pos.y;
      }
    });
    Object.defineProperty(this, 'right', {
      get: () => {
        return this.pos.x + this.size.x;
      }
    });
    Object.defineProperty(this, 'bottom', {
      get: () => {
        return this.pos.y + this.size.y;
      }
    });
  }

  get type() {
    return 'actor';
  }

  act() {

  }

  isIntersect(actor) {
    if (!(Actor.prototype.isPrototypeOf(actor))) {
      throw new Error(`Аргумент isIntersect не является экземпляром Actor`);
    }
    if (Object.is(this, actor))
      return false;
    if ((this.right > actor.left && this.left < actor.right) && (this.bottom > actor.top && this.top < actor.bottom)) {
      return true;
    }
    return false;
  }
}

class Level {
  constructor(grid = [], actors = []) {
    this.grid = grid;
    this.actors = actors;
    this.status = null;
    this.finishDelay = 1;
    actors.some((val) => {
      if (val.type === 'player') {
        this.player = val;
        return true;
      }
    });
  }

  get height() {
    return this.grid.length;
  }

  get width() {
    return this.grid.reduce((max, val) => {
      return max < val.length ? val.length : max;
    }, 0);
  }

  isFinished() {
    return this.status !== null && this.finishDelay < 0 ? true : false;
  }

  actorAt(actor) {
    if (!actor || !(actor instanceof Actor)) {
      throw new Error('Аргумент "actorAt" не является экземпляром Actor или не задан')
    }
    return this.actors.find((val) => {
      return actor.isIntersect(val);
    });
  }

  obstacleAt(route, size) {
    if (!(route instanceof Vector && size instanceof Vector)) {
      throw new Error('Аргумент "obstacleAt" не является экземпляром Vector')
    }

    const testActor = new Actor(route, size); // нужен, чтобы пользоваться свойствами Actor
    if (testActor.left < 0 || testActor.right > this.width || testActor.top < 0)
      return 'wall';
    else if (testActor.bottom > this.height)
      return 'lava';
    else {
      for (let y = Math.floor(testActor.top); y < testActor.bottom; y++) {
        for (let x = Math.floor(testActor.left); x < testActor.right; x++) {
          if (this.grid[y][x] !== undefined) {
            return this.grid[y][x];
          }
        }
      }
    }
  }

  removeActor(actor) {
    this.actors.forEach((val, i) => {
      if (actor === val)
        this.actors.splice(i, 1);
    });
  }

  noMoreActors(type) {
    return !(this.actors.some((val) => {
      return val.type === type;
    }));
  }

  playerTouched(type, actor) {
    if (this.status !== null)
      return;
    if (type === 'lava' || type === 'fireball') {
      this.status = 'lost';
    }
    if (type === 'coin') {
      this.removeActor(actor);
      if (this.noMoreActors(type)) {
        this.status = 'won';
      }
    }
  }
}

class LevelParser {
  constructor(actorsDict) {
    this.dict = actorsDict;
  }

  actorFromSymbol(sym) {
    for (let i in this.dict) {
      if (sym === i)
        return this.dict[i];
    }
    return undefined;
  }

  obstacleFromSymbol(sym) {
    if (sym === 'x')
      return 'wall';
    else if (sym === '!')
      return 'lava';
    else
      return undefined;
  }

  createGrid(plan) {
    const grid = [];
    plan.forEach((val) => {
      let row = val.split('').map((key) => {
        return this.obstacleFromSymbol(key);
      });
      grid.push(row);
    });
    return grid;
  }

  createActors(plan) {
    const actors = [];
    if (!this.dict)
      return actors;
    plan.forEach((val, y) => {
      val.split('').forEach((key, x) => {
        const constr = this.actorFromSymbol(key);
        if (constr && (constr.prototype instanceof Actor || constr == Actor)) {
          actors.push(new constr(new Vector(x, y)));
        }
      });
    });
    return actors;
  }

  parse(plan) {
    return new Level(this.createGrid(plan), this.createActors(plan));
  }
}

class Fireball extends Actor {
  constructor(pos = new Vector(0, 0), speed = new Vector(0, 0)) {
    super();
    this.pos = pos;
    this.speed = speed;
    this.size = new Vector(1, 1);
    Object.defineProperty(this, 'type', {
      get: function () {
        return 'fireball';
      }
    });
  }

  getNextPosition(time = 1) {
    return new Vector(this.pos.x + this.speed.x * time, this.pos.y + this.speed.y * time);
  }

  handleObstacle() {
    this.speed.x *= -1;
    this.speed.y *= -1;
  }

  act(time, level) {
    let obstacle = level.obstacleAt(this.getNextPosition(time), this.size);
    if (!obstacle) {
      this.pos.x = this.pos.x + this.speed.x * time;
      this.pos.y = this.pos.y + this.speed.y * time;
    } else {
      this.handleObstacle();
    }
  }
}

class HorizontalFireball extends Fireball {
  constructor(pos) {
    super(pos);
    this.speed = new Vector(2, 0);
    if (pos)
      this.pos = pos;
  }
}

class VerticalFireball extends Fireball {
  constructor(pos) {
    super(pos);
    this.speed = new Vector(0, 2);
    if (pos)
      this.pos = pos;
  }
}

class FireRain extends Fireball {
  constructor(pos) {
    super(pos);
    this.speed = new Vector(0, 3);
    if (pos)
      this.pos = pos;
    this.startPos = pos;
  }

  handleObstacle() {
    this.pos = this.startPos;
  }
}

class Coin extends Actor {
  constructor(pos) {
    super(pos);
    if (pos)
      this.pos = pos;
    this.size = new Vector(0.6, 0.6);
    this.pos = this.pos.plus(new Vector(0.2, 0.1));
    Object.defineProperty(this, 'type', {
      get: function () {
        return 'coin';
      }
    });
    this.springSpeed = 8;
    this.springDist = 0.07;
    this.spring = rand(0, 2 * Math.PI);
    this.startPos = new Vector(this.pos.x, this.pos.y);
  }

  updateSpring(time = 1) {
    this.spring = this.spring + this.springSpeed * time;
  }

  getSpringVector() {
    return new Vector(0, Math.sin(this.spring) * this.springDist);
  }

  getNextPosition(time = 1) {
    this.spring += this.springSpeed * time;
    const a = this.startPos.plus(this.getSpringVector());
    return new Vector(a.x, a.y);
  }

  act(time) {
    const newPos = this.getNextPosition(time);
    this.pos.x = newPos.x;
    this.pos.y = newPos.y;
  }
}

class Player extends Actor {
  constructor(pos) {
    super(pos);
    Object.defineProperty(this, 'type', {
      get: function () {
        return 'player';
      }
    });
    if (pos)
      this.pos = pos;
    this.size = new Vector(0.8, 1.5);
    this.pos = this.pos.plus(new Vector(0, -0.5));
    this.speed = new Vector(0, 0);
  }
}

loadLevels()
  .then(result => {
    const schemas = JSON.parse(result);

    const actorDict = {
      '@': Player,
      'v': FireRain,
      'o': Coin,
      '=': HorizontalFireball,
      '|': VerticalFireball
    };

    runGame(schemas, new LevelParser(actorDict), DOMDisplay)
      .then(() => alert('Вы выиграли приз!'))
      .catch((e) => console.log(e));
  });

























