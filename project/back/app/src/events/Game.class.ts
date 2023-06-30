import { Server, Socket } from 'socket.io';
import { GameService } from 'src/game/game.service';
import { sleep } from '../utils/sleep';
import { time } from 'console';

export class Game {
  static default_sizeMaxX = 100;
  static default_positionBx = this.default_sizeMaxX / 2;
  static default_sizeMaxY = 100;
  static default_positionBy = this.default_sizeMaxY / 2;
  static default_update = 8;
  static default_racklenght = 15;
  static default_positionR =
    this.default_sizeMaxX / 2 - this.default_racklenght / 2;
  static default_rackwidth = 2;
  static default_radiusball = 1;
  static default_speedBall = 0.25;
  static default_sizeMinX = 0;
  static default_sizeMinY = 0;
  static default_victorygoal = 3;
  static default_rackspeed = 2;
  static default_maxpowerupreverse = 2;
  static default_maxpowerupstop = 2;
  static default_maxtimestop = 60;

  private _io: Server;
  private _loopid: NodeJS.Timeout;
  private _id: string;
  private _user1: Socket;
  private _user2: Socket;
  private _rack1y: number;
  private _rack2y: number;
  private _score1: number;
  private _score2: number;
  private _ballx: number;
  private _bally: number;
  private _speedball: number;
  private _angle;
  private _minX;
  private _maxX;
  private _minY;
  private _maxY;
  private _futurballx;
  private _futurbally;
  private _gameService: GameService;
  private _package: number;
  private _isPowerUp: boolean;
  private _player1_reversey: number;
  private _player2_reversey: number;
  private _player1_reversex: number;
  private _player2_reversex: number;
  private _wait_ball: number;
  private _player1_stop: number;
  private _player2_stop: number;
  private _stop: boolean;
  private _playerstop: string;
  private _time_stop_user1: number;
  private _time_stop_user2: number;
  private _loop_stop: NodeJS.Timeout;
  private _started: boolean;
  private _endgame: boolean;

  public constructor(
    id: string,
    user1: Socket,
    user2: Socket,
    io: Server,
    gameService: GameService,
  ) {
    this._id = id;
    this._user1 = user1;
    this._user2 = user2;
    this._rack1y = Game.default_positionR;
    this._rack2y = Game.default_positionR;
    this._score1 = 0;
    this._score2 = 0;
    this._ballx = Game.default_positionBx;
    this._bally = Game.default_positionBy;
    this._speedball = Game.default_speedBall;
    this._minX = Game.default_sizeMinX;
    this._maxX = Game.default_sizeMaxX;
    this._minY = Game.default_sizeMinY;
    this._maxY = Game.default_sizeMaxY;
    this._futurballx = this._ballx;
    this._futurbally = this._bally;
    this._io = io;
    this._angle = 180;
    this._gameService = gameService;
    this._package = 0;
    this._wait_ball = 0;
    this._stop = false;
    this._time_stop_user1 = Game.default_maxtimestop;
    this._time_stop_user2 = Game.default_maxtimestop;
    this._started = false;
    this._endgame = false;
  }

  public getId() {
    return this._id;
  }

  public getUser1() {
    return this._user1;
  }

  public getUser2() {
    return this._user2;
  }

  private beginStop = (userStop: Socket, userNoStop: Socket, time: number) => {
    if (!this._stop && this._started) {
      this._stop = true;
      userStop.emit('is_stop_game', { stop: true, stoper: true, time: time });
      userNoStop.emit('is_stop_game', {
        stop: true,
        stoper: false,
        time: time,
      });
      this._playerstop = userStop.id;
      this._loop_stop = setInterval(this.delayStop, 1000);
    }
  };

  public updateRacket = (player: Socket, y: number) => {
    if (y == 2) {
      if (this._stop && player.id == this._playerstop) {
        this.endOfStop();
        return;
      }
      if (!this._stop) {
        if (player.id == this._user1.id && this._time_stop_user1 > 0) {
          this._time_stop_user1 -= 1;
          this.beginStop(this._user1, this._user2, this._time_stop_user1);
        }
        if (player.id == this._user2.id && this._time_stop_user2 > 0) {
          this._time_stop_user2 -= 1;
          this.beginStop(this._user2, this._user1, this._time_stop_user2);
        }
      }
    }

    if (this._stop) {
      return;
    }
    if (player.id == this._user1.id) {
      if (y == 1) {
        if (this._rack1y >= this._maxY - Game.default_racklenght)
          this._rack1y = this._maxY - Game.default_racklenght;
        else this._rack1y += Game.default_rackspeed;
      } else if (y == 0) {
        if (this._rack1y - Game.default_rackspeed <= 0) this._rack1y = 0;
        else this._rack1y -= Game.default_rackspeed;
      }
    } else if (player.id == this._user2.id) {
      if (y == 1) {
        if (this._rack2y >= this._maxY - Game.default_racklenght)
          this._rack2y = this._maxY - Game.default_racklenght;
        else this._rack2y += Game.default_rackspeed;
      } else if (y == 0) {
        if (this._rack2y <= 0) this._rack2y = 0;
        else this._rack2y -= Game.default_rackspeed;
      }
    }

    if (!this._isPowerUp) return;

    if (y == 3) {
      if (player.id == this._user2.id && this._player2_reversey > 0) {
        this._angle = Math.PI - this._angle;
        this._player2_reversey -= 1;
      }
      if (player.id == this._user1.id && this._player1_reversey > 0) {
        this._angle = Math.PI - this._angle;
        this._player1_reversey -= 1;
      }
    }
    if (y == 4) {
      if (player.id == this._user2.id && this._player2_reversex > 0) {
        this._player2_reversex -= 1;
        this._angle = -this._angle;
      }
      if (player.id == this._user1.id && this._player1_reversex > 0) {
        this._player1_reversex -= 1;
        this._angle = -this._angle;
      }
    }

    if (y == 5) {
      if (player.id == this._user1.id && this._player1_stop > 0) {
        this._player1_stop -= 1;
        this._wait_ball = 100;
      }
      if (player.id == this._user2.id && this._player2_stop > 0) {
        this._player2_stop -= 1;
        this._wait_ball = 100;
      }
    }
  };

  public definePowerUp(powerup: boolean) {
    this._isPowerUp = powerup;
    this._player1_reversey = Game.default_maxpowerupreverse;
    this._player2_reversey = Game.default_maxpowerupreverse;
    this._player1_reversex = Game.default_maxpowerupreverse;
    this._player2_reversex = Game.default_maxpowerupreverse;
    this._player1_stop = Game.default_maxpowerupstop;
    this._player2_stop = Game.default_maxpowerupstop;
  }

  public getGameInfo() {
    this._package++;
    return {
      id: this._id,
      rack1y: this._rack1y,
      rack2y: this._rack2y,
      score1: this._score1,
      score2: this._score2,
      ballx: this._ballx,
      bally: this._bally,
      package: this._package,
    };
  }

  public async start() {
    await sleep(1000);
    while (
      Math.cos(this._angle) < 0.5 &&
      Math.cos(this._angle) > -0.5 &&
      this._angle != 0 &&
      this._angle != 180
    ) {
      this._angle = Math.random() * 360;
    }
    this._loopid = setInterval(this.gameLoop, Game.default_update);
    this._started = true;
  }

  public gameLoop = async () => {
    if (this._stop) {
      return;
    }
    if (this._wait_ball > 0) {
      this._wait_ball -= 1;
      return;
    }
    this._futurballx = this._ballx + Math.sin(this._angle) * this._speedball;
    this._futurbally = this._bally + Math.cos(this._angle) * this._speedball;
    const minposition =
      this._minY + Game.default_rackwidth + Game.default_radiusball;
    const maxposition =
      this._maxY - Game.default_rackwidth - Game.default_radiusball;

    if (this._futurbally <= minposition && this._futurbally > minposition - 2) {
      if (
        this._futurballx >= this._rack1y &&
        this._futurballx <= this._rack1y + Game.default_racklenght
      ) {
        if (this._isPowerUp) this._speedball *= 1.05;
        else this._speedball *= 1.15;
        this._angle = Math.PI - this._angle;
        const distbar = this._futurbally - minposition;
        this._futurbally -= 2 * distbar;
      } else {
      }
    }

    if (this._futurbally >= maxposition && this._futurbally < maxposition + 2) {
      if (
        this._futurballx >= this._rack2y &&
        this._futurballx <= this._rack2y + Game.default_racklenght
      ) {
        if (this._isPowerUp) this._speedball *= 1.05;
        else this._speedball *= 1.15;
        this._angle = Math.PI - this._angle;
        const distbar = this._futurbally - maxposition;
        this._futurbally -= 2 * distbar;
      } else {
      }
    }

    if (this._futurbally < Game.default_sizeMinY - Game.default_radiusball) {
      this._score1 = this.endBattle(this._score1);
      if (this._score1 >= Game.default_victorygoal) {
        await this.endWar(this._user1, this._user2, 1);
        this.clear();
        return;
      } else {
        this.clear();
        await this.start();
        return;
      }
    }

    if (this._futurbally > Game.default_sizeMaxY + Game.default_radiusball) {
      this._score2 = this.endBattle(this._score2);
      if (this._score2 >= Game.default_victorygoal) {
        await this.endWar(this._user2, this._user1, 2);
        return;
      } else {
        this.clear();
        await this.start();
        return;
      }
    }

    if (
      this._futurballx < this._minX + (Game.default_radiusball + 1) ||
      this._futurballx > this._maxX - (Game.default_radiusball + 1)
    ) {
      if (this._futurballx < this._minX + (Game.default_radiusball + 1)) {
        const distbar =
          this._futurballx - (this._minX + Game.default_radiusball);
        this._futurballx -= 2 * distbar;
      } else {
        const distbar =
          this._futurballx - (this._maxX - Game.default_radiusball);
        this._futurballx += 2 * distbar;
      }
      this._angle = -this._angle;
    }
    this._ballx = this._futurballx;
    this._bally = this._futurbally;

    this._io.to(this._id).emit('update_game', this.getGameInfo());
  };

  public async remake() {
    this._io.to(this._id).emit('finish_game', {
      score1: 0,
      score2: 0,
      status: 'remake',
      username: 'none',
    });

    this._user2.leave(this._id);
    this._user1.leave(this._id);
    this.clear();
    return;
  }

  public clear = () => {
    if (this._loopid != null) clearInterval(this._loopid);
    this._loopid = null;
  };

  private endOfStop = () => {
    if (this._stop) {
      clearInterval(this._loop_stop);
      this._user1.emit('is_stop_game', { stop: false, stoper: false });
      this._user2.emit('is_stop_game', { stop: false, stoper: false });
      this._stop = false;
    }
  };

  private delayStop = () => {
    if (
      (this._playerstop == this._user1.id && this._time_stop_user1 <= 0) ||
      (this._playerstop == this._user2.id && this._time_stop_user2 <= 0)
    ) {
      this.endOfStop();
      return;
    }

    if (this._playerstop == this._user1.id) {
      this._user1.emit('stop_game', { time: this._time_stop_user1 });
      this._user2.emit('stop_game', { time: this._time_stop_user1 });
      this._time_stop_user1 -= 1;
    } else {
      this._user1.emit('stop_game', { time: this._time_stop_user2 });
      this._user2.emit('stop_game', { time: this._time_stop_user2 });
      this._time_stop_user2 -= 1;
    }
  };

  private endWar = async (userWin: Socket, userDefeat: Socket, winuser) => {
    if (this._endgame) return;
    this._endgame = true;
    this._time_stop_user1 = Game.default_maxtimestop;
    this._time_stop_user2 = Game.default_maxtimestop;
    this._user1.leave(this._id);
    this._user2.leave(this._id);
    const g = await this._gameService.finishGame(
      this._id,
      this._score1,
      this._score2,
    );
    let winname: string;
    let losename: string;
    if (winuser == 1) {
      losename = g.user1.username;
      winname = g.user2.username;
    } else {
      losename = g.user2.username;
      winname = g.user1.username;
    }
    this._user2.leave(this._id);
    this._user1.leave(this._id);
    userWin.emit('finish_game', {
      score1: this._score1,
      score2: this._score2,
      status: 'lost',
      adversary: winname,
    });
    userDefeat.emit('finish_game', {
      score1: this._score1,
      score2: this._score2,
      status: 'won',
      adversary: losename,
    });
    this.clear();
  };

  private endBattle = (scoreWin: number): number => {
    scoreWin++;
    this._started = false;
    if (scoreWin < Game.default_victorygoal) {
      this._rack1y = Game.default_positionR;
      this._rack2y = Game.default_positionR;
      this._ballx = Game.default_positionBx;
      this._bally = Game.default_positionBy;
      this._futurballx = this._ballx;
      this._futurbally = this._bally;
      this._speedball = Game.default_speedBall;
      this._io.to(this._id).emit('update_game', this.getGameInfo());
    }
    return scoreWin;
  };
}
