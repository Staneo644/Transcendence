import './css/optiongame.css'
import './css/game.css'
import {animated, useSpring} from 'react-spring';
import React, {useEffect, useState} from 'react';
import SocketSingleton from '../socket';
import {useNavigate} from 'react-router-dom';
import {RootState} from '../redux/store';
import {useDispatch, useSelector} from 'react-redux';
import ErrorToken from '../components/IfError';
import {setBeginStatus} from '../redux/game/beginToOption';

import Ball1 from '../images/game/ball/Ball1.png';
import Ball2 from '../images/game/ball/Ball2.png';
import Ball3 from '../images/game/ball/Ball3.png';

import Map1 from '../images/game/map/Map1.png';
import Map2 from '../images/game/map/Map2.png';
import Map3 from '../images/game/map/Map3.png';

const socketInstance = SocketSingleton.getInstance();
const socket = socketInstance.getSocket();


const OptionGame = () => {

	const spinnerAnimationBall = useSpring({
		from: {transform: 'rotate(0deg)'},
		to: {transform: 'rotate(360deg)'},
		loop: true,
		config: {duration: 4000},
	});
	const dispatch = useDispatch();
	const navigate = useNavigate();
	const decide = useSelector((state: RootState) => state.beginToOption.decide);
	const playerstats = useSelector((state: RootState) => state.beginToOption.playerstate);
	const id = useSelector((state: RootState) => state.beginToOption.gameid);
	const gamestate = useSelector((state: RootState) => state.beginToOption.gamestate)
	useEffect(() => {
		if (id == null || gamestate != 1)
			navigate('/home');
		dispatch(setBeginStatus({decide: decide, playerstate: playerstats, gameid: id, gamestate: 2}));

		socket.on("finish_game", () => {
			navigate('/home')
		})

		socket.on('will_started', () => {
			navigate('/game');
		})

		return () => {
			socket.off('will_started');
		}

	}, [socket])

	const [nbBall, setNbBall] = useState(Ball1);
	const [nbMap, setNbMap] = useState(Map1);
	const [isPowerup, setIsPowerup] = useState(false);

	const enterGame = () => {
		socket.emit('option_send', {
			ball: nbBall,
			map: nbMap,
			powerup: isPowerup,
			token: localStorage.getItem('jwtAuthorization')
		})
	}

	const selectBall = (str: string) => {
		setNbBall(str)
	}

	const selectMap = (str: string) => {
		setNbMap(str)
	}

	const selectPowerUp = (power: boolean) => {
		setIsPowerup(power);
	}

	return (
		<div className='game-option-game-page'>
			<ErrorToken/>
			{!decide &&
                <div className='game-waiting-settings'>
                    Waiting your opponent to choose settings...
                </div>
			}

			{decide &&
                <div className='game-option-game-block'>
                    <h1 className='game-option-game-title'>Game Option</h1>
                    <div className='game-option-game-titles-option'>
                        Ball
                    </div>

                    <div className="button-group">
                        <button
                            className={`button ${nbBall === Ball1 ? 'game-option-game-selected-button' : ''}`}
                            onClick={() => selectBall(Ball1)}>
                            Ball 1
                        </button>
                        <button
                            className={`button ${nbBall === Ball2 ? 'game-option-game-selected-button' : ''}`}
                            onClick={() => selectBall(Ball2)}>
                            Ball 2
                        </button>
                        <button
                            className={`button ${nbBall === Ball3 ? 'game-option-game-selected-button' : ''}`}
                            onClick={() => selectBall(Ball3)}>
                            Ball 3
                        </button>
                    </div>
                    <div className='game-option-game-ball'>
                        <animated.img src={nbBall} className={'game-option-game-ball'}
                                      style={spinnerAnimationBall}></animated.img>
                    </div>

                    <div className='game-option-game-titles-option'>
                        Map
                    </div>

                    <div className="button-group">
                        <button
                            className={`button ${nbMap === Map1 ? 'game-option-game-selected-button' : ''}`}
                            onClick={() => selectMap(Map1)}>
                            Map 1
                        </button>
                        <button
                            className={`button ${nbMap === Map2 ? 'game-option-game-selected-button' : ''}`}
                            onClick={() => selectMap(Map2)}>
                            Map 2
                        </button>
                        <button
                            className={`button ${nbMap === Map3 ? 'game-option-game-selected-button' : ''}`}
                            onClick={() => selectMap(Map3)}>
                            Map 3
                        </button>
                    </div>

                    <div className='game-option-game-background'>
                        <img src={nbMap} width={300} height={200}/>
                    </div>

                    <div className='game-option-game-titles-option'>
                        Powerup
                    </div>

                    <div className="button-group">
                        <button
                            className={`button ${isPowerup === false ? 'game-option-game-selected-button' : ''}`}
                            onClick={() => selectPowerUp(false)}>
                            no powerup
                        </button>
                        <button
                            className={`button ${isPowerup === true ? 'game-option-game-selected-button' : ''}`}
                            onClick={() => selectPowerUp(true)}>
                            powerup
                        </button>
                    </div>

                    <button className='game-option-game-confirm-button' onClick={enterGame}>
                        confirm
                    </button>
                </div>
			}
		</div>
	);
}

export default OptionGame;