import {createSlice, PayloadAction} from '@reduxjs/toolkit';

interface GameState {
	decide: boolean;
	playerstate: number;
	gamestate: number;
	gameid: string | null;
}

const initialState: GameState = {
	gamestate: 0,
	decide: false,
	playerstate: 0,
	gameid: null,
};

const beginGameSlice = createSlice({
	name: 'begingame',
	initialState,
	reducers: {
		setBeginStatus: (state, action: PayloadAction<any>) => {
			state.decide = action.payload.decide;
			state.playerstate = action.payload.playerstate;
			state.gameid = action.payload.gameid;
			state.gamestate = action.payload.gamestate;
		},
	},
});

export const {setBeginStatus} = beginGameSlice.actions;

export default beginGameSlice.reducer;