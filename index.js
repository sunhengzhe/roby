/**
 * 每个个体为形如 014026451203623... 长度为 243 的字符串
 * 每一位对应一种行动状态:
 * 0: 上
 * 1: 下
 * 2: 左
 * 3: 右
 * 4: 随机移动
 * 5: 捡罐子
 * 6: 不动 
 * 每一位的角标对应
 * 上 下 左 右 中
 * 0 0 0 0 0
 * 0 0 0 0 1
 * 0 0 0 0 2
 * ...
 * 一共 243 种可能性中的的第[角标]个
 * 其中
 * 0: 空
 * 1: 罐头
 * 2: 墙壁
 */

// 种群数量
const POPULATION_SIZE = 200;
// 打扫次数
const TRY_TIMES = 100;
// 动作次数
const MOVE_TIMES = 200;
// 罐子出现概率
const JAR_PROBABILITY = 0.5;
// 变异概率
const VARIATION_PROBABILITY = 0.078;
// 进化代数
const EVAL_TIMES = 2000;
// 交叉概率
const CROSS_PROBABILITY = 0.82;
// 变异时最多变异的基因个数
const MAX_VARI_COUNT = 10;
// 得分规则
const Rule = {
  PICK_JAR: 10,
  PICK_NOTHING: -1,
  HIT_WALL: -5
}

/**
 * 舞台
 */
const Stage = {
  COL: 10,
  ROW: 10,
  // 创建一个舞台
  create: () => {
    const stage = [];
    for (let i = 0; i < Stage.ROW; i++) {
      stage[i] = [];
      for (let j = 0; j < Stage.COL; j++) {
        stage[i][j] = Math.random() < JAR_PROBABILITY ? 0 : 1;
      }
    }
    return stage;
  },
  print: (stage, pos) => {
    process.stdout.write('----------\n');
    for (let i = 0; i < Stage.ROW; i++) {
      for (let j = 0; j < Stage.COL; j++) {
        if (pos.x === j && pos.y === i) {
          process.stdout.write('#');
        } else {
          process.stdout.write(stage[i][j] === 1 ? 'x': 'o');
        }
      }
      process.stdout.write('\n');
    }
  },
  // 获取当前单元格内状态
  getState: (stage, x, y) => {
    if (stage[y] === undefined) {
      return 2;
    }
    return stage[y][x] === undefined ? 2 : stage[y][x];
  }
};

/**
 * 根据策略和当前状态获取接下来的动作
 */
const getMovement = (strategy, state) => {
  /**
   * 上下左右中 5位数
   * 每位数可取 0 1 2
   * 实际上就是 5 位的所有 3 进制数
   * 转十进制即得到角标
   */
  return parseInt(strategy[parseInt(state, 3)]);
}

/**
 * 行动
 * 返回是否撞墙
 */
const move = (pos, direction, curState) => {
  switch (direction) {
    case 0:
      // 上
      if (curState[0] === '2') {
        // 碰壁
        return true;
      }
      pos.y--;
      break;
    case 1:
      // 下
      if (curState[1] === '2') {
        // 碰壁
        return true;
      }
      pos.y++;      
      break;
    case 2:
      // 左
      if (curState[2] === '2') {
        // 碰壁
        return true;
      }
      pos.x--;
      break;
    case 3:
      // 右
      if (curState[3] === '2') {
        // 碰壁
        return true;
      }
      pos.x++;
      break;
  }
  return false;
}

/**
 * 生成初始种群，每个种群含 POPULATION_SIZE 个随机个体
 */
const getInitPopulation = () => {
  const population = [];
  // 生成种群
  for (let i = 0; i < POPULATION_SIZE; i++) {
    // 随机生成一个个体
    let strategy = '';
    for (let j = 0; j < 243; j++) {
      strategy += Math.floor(Math.random() * 7);
    }
    // 将个体添加进种群
    population.push(strategy);
  }
  return population;
}

/**
 * 计算个体适应度
 */
const getIndividualFitness = (strategy) => {
  let sum = 0;
  for (let i = 0; i < TRY_TIMES; i++) {
    // 生成棋盘
    const stage = Stage.create();
    // 初始化位置
    const pos = {
      x: Math.floor(Math.random() * Stage.COL),
      y: Math.floor(Math.random() * Stage.ROW)
    };
    // 得分
    let score = 0;
    // 运行
    for (let i = 0; i < MOVE_TIMES; i++) {
      // 上下左右中
      const up = Stage.getState(stage, pos.x, pos.y - 1);
      const down = Stage.getState(stage, pos.x, pos.y + 1);
      const left = Stage.getState(stage, pos.x - 1, pos.y);
      const right = Stage.getState(stage, pos.x + 1, pos.y);
      const center = Stage.getState(stage, pos.x, pos.y);
      // 当前状态
      const curState = `${up}${down}${left}${right}${center}`;
      // 获取行动
      const movement = getMovement(strategy, curState);
      // 行动
      switch (movement) {
        case 0:
        case 1:
        case 2:
        case 3:
          // 上下左右
          if (move(pos, movement, curState)) {
            score += Rule.HIT_WALL;
          }
          break;
        case 4:
          // 随机移动
          const direction = Math.floor(Math.random() * 4);
          if (move(pos, direction, curState)) {
            score += Rule.HIT_WALL;
          }
          break;
        case 5:
          // 捡罐头
          if (center === 1) {
            stage[pos.y][pos.x] = 0;
            score += Rule.PICK_JAR;
          } else {
            score += Rule.PICK_NOTHING;
          }
          break;
        case 6:
          // 不动
          break;
      }
    }
    
    sum += score;
  }

  const averScore = Math.floor(sum / TRY_TIMES);

  return averScore;
}

/**
 * 获取种群平均适应度
 */
const getAverageFitness = (scoreList) => {
  const average = scoreList.reduce((cur, prev) => {
    return {
      score: cur.score + prev.score
    };
  }).score / scoreList.length;
  return average;
}

/**
 * 计算种群适应度
 */
const getPopulationFitness = (population) => {
  const scoreList = [];

  for (const item of population) {
    // 对每个个体计算适应度
    const score = getIndividualFitness(item);
    scoreList.push({
      strategy: item,
      score
    });
  }

  return scoreList;
}

/**
 * 进化
 */
const evolve = (scoreList) => {
  // 从小到大排列
  scoreList.sort((a, b) => {
    return a.score - b.score;
  });

  console.log(getAverageFitness(scoreList));
  console.log(`最高分：${scoreList[scoreList.length - 1].score}`);
  console.log(`${scoreList[scoreList.length - 1].strategy}`);
  
  // 调整分数，保证所有分数都是正数以计算概率
  // 绝对值 + 1
  const adjust = Math.abs(scoreList[0].score) + 1;
  scoreList.forEach((item, index, arr) => {
    // 次方 4: 300
    // 次方 2: 400
    arr[index].score = Math.pow(arr[index].score + adjust, 2);
  });
  // 总分数
  const total = scoreList.reduce((cur, prev) => {
    return {
      score: cur.score + prev.score
    }
  }).score;
  // 生成轮盘
  const weigthArr = [];
  let prevWeight = 0;
  for (let i = 0; i < scoreList.length; i++) {
    const weight = scoreList[i].score / total + prevWeight;
    weigthArr.push(weight);
    prevWeight = weight;
  }

  // 交叉点
  let rPos = Math.floor(Math.random() * 243);
  while (rPos === 0) {
    // 交叉点不能等于 0
    rPos = Math.floor(Math.random() * 243);
  }

  // 下一代总群
  let newPopulation = [];
  while (newPopulation.length < POPULATION_SIZE) {
    let father, mother;
    // 生成父亲
    const r1 = Math.random();
    for (let i = 0; i < weigthArr.length; i++) {
      if (r1 <= weigthArr[i]) {
        father = scoreList[i].strategy;
        break;
      }
    }
    // 生成母亲
    const r2 = Math.random();
    for (let i = 0; i < weigthArr.length; i++) {
      if (r2 <= weigthArr[i]) {
        mother = scoreList[i].strategy;
        break;
      }
    }
    // 生成后代
    let child1, child2;
    // 交叉概率
    const crossRate = Math.random();
    
    if (crossRate < CROSS_PROBABILITY) {
      child1 = father.slice(0, rPos) + mother.slice(rPos);
      child2 = mother.slice(0, rPos) + father.slice(rPos);
    } else {
      child1 = father;
      child2 = mother;
    }

    // 变异
    let r = Math.random();
    if (r < VARIATION_PROBABILITY) {
      let rCount = Math.floor(Math.random() * (MAX_VARI_COUNT - 1)) + 1;
      for (let i = 0; i < rCount; i++) {
        // 该处基因变异
        let rIndex = Math.floor(Math.random() * 243);
        let newGen = Math.floor(Math.random() * 7);
        while (newGen == child1[rIndex]) { // 数字和字符串的比较
          // 变异基因和原先不一样
          newGen = Math.floor(Math.random() * 7);
        }

        child1 = child1.slice(0, rIndex) + newGen + child1.slice(rIndex + 1);
      }
    }
    r = Math.random();
    if (r < VARIATION_PROBABILITY) {
      let rCount = Math.floor(Math.random() * (MAX_VARI_COUNT - 1)) + 1;
      for (let i = 0; i < rCount; i++) {
        // 该处基因变异
        let rIndex = Math.floor(Math.random() * 243);
        let newGen = Math.floor(Math.random() * 7);
        while (newGen == child2[rIndex]) { // 数字和字符串的比较
          newGen = Math.floor(Math.random() * 7);
        }

        child2 = child2.slice(0, rIndex) + newGen + child2.slice(rIndex + 1);
      }
    }

    newPopulation.push(child1, child2);
  }

  return newPopulation;
}

const start = () => {
  // 初始化种群
  let population = getInitPopulation();
  let scoreList;
  
  for (let i = 0; i < EVAL_TIMES; i++) {
    // 计算种群的适应度
    scoreList = getPopulationFitness(population);
    // 进化产生新种群
    population = evolve(scoreList);
  }
}

start();
