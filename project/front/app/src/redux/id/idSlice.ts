import {createSlice, PayloadAction} from '@reduxjs/toolkit';

interface IdState {
	id: string | null;
}

const initialState: IdState = {
	id: null,
};

const idSlice = createSlice({
	name: 'id',
	initialState,
	reducers: {
		setId: (state, action: PayloadAction<string | null>) => {
			state.id = action.payload;
		},
	},
});

export const {setId} = idSlice.actions;

export default idSlice.reducer;
