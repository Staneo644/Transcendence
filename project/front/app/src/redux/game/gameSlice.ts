import {createSlice, PayloadAction} from '@reduxjs/toolkit';

interface GameState {
	finalStatus: any | null;
}

const initialState: GameState = {
	finalStatus: null,
};

const gameSlice = createSlice({
	name: 'game',
	initialState,
	reducers: {
		setFinalStatus: (state, action: PayloadAction<any>) => {
			state.finalStatus = action.payload;
		},
	},
});

export const {setFinalStatus} = gameSlice.actions;

export default gameSlice.reducer;
