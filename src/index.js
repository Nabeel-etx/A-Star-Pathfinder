import React from "react";
import ReactDOM from "react-dom";

import "./styles.css";
import { useImmerReducer } from "use-immer";
import styled from "styled-components";
import { MuiThemeProvider, createMuiTheme } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import CssBaseline from "@material-ui/core/CssBaseline";
import MoodOutlinedIcon from "@material-ui/icons/MoodOutlined";
import MoodIcon from "@material-ui/icons/Mood";
import _flatten from "lodash/flatten";
import _memoize from "lodash/memoize";
import * as PF from "pathfinding";
import matrixJs from "matrix-js";
import { Toolbar } from "@material-ui/core";

const algorithms = "AStarFinder";
const size = 8;
const matrix = [
  [1, 1, 0, 0, 0, 0, 0, 0],
  [1, 0, 0, 0, 0, 0, 0, 0],
  [1, 0, 0, 0, 1, 1, 0, 0],
  [0, 0, 0, 0, 0, 1, 0, 0],
  [0, 0, 1, 0, 0, 0, 0, 0],
  [0, 0, 1, 1, 0, 0, 0, 1],
  [0, 0, 0, 0, 0, 0, 0, 1],
  [0, 0, 0, 0, 0, 0, 1, 1]
];

function getIndexFromPosition(x, y, size) {
  return x * size + y;
}

function getGridFromMatrix({ matrix }) {
  return new PF.Grid([...matrix]);
}

function getTilesFromMatrix({ matrix }) {
  return _flatten(
    matrixJs(matrix)
      .trans()
      .map((column, x) =>
        column.map((value, y) => ({
          x, // column
          y, // row
          walkable: !value, // 0 is walkable and 1 is not walkable
          i: getIndexFromPosition(x, y),
          inPath: false, // no path
          isStart: false, // no sstarting tile has been selected yet
          isEnd: false // no ending tile yet
        }))
      )
  );
}

const getPathFinder = _memoize(
  ({ algorithm, allowDiagonal }) => {
    return new PF[algorithm]({
      allowDiagonal
    });
  },
  ({ algorithm, allowDiagonal }) => algorithm + allowDiagonal
);

// function getPositionsAreEqual(a, b) {
//   return a && b && a.x === b.x && a.y === b.y;
// }

function computeTiles({ start, end, algorithm, allowDiagonal, matrix }) {
  const tiles = getTilesFromMatrix({ matrix });
  if (start) {
    tiles[getIndexFromPosition(start.x, start.y, size)].isStart = true;
  }
  if (end) {
    tiles[getIndexFromPosition(end.x, end.y, size)].isEnd = true;
  }
  if (start && end) {
    const pathFinder = getPathFinder({ algorithm, allowDiagonal });
    const grid = getGridFromMatrix({ matrix });
    const path = pathFinder.findPath(start.x, start.y, end.x, end.y, grid);
    path.forEach(([x, y]) => {
      tiles[getIndexFromPosition(x, y, size)].inPath = true;
    });
  }
  return tiles;
}

const theme = createMuiTheme({
  palette: {
    type: "dark"
  }
});

const initialState = {
  start: null,
  end: null,
  pathSet: false,
  algorithm: "AStarFinder",
  allowDiagonal: true,
  matrix,
  editMode: false
};

function reducer(state, action) {
  switch (action.type) {
    case "tile clicked": {
      const { tile } = action;
      if (state.pathSet && tile.walkable) {
        state.pathSet = false;
        state.start = tile;
        state.end = null;
      } else if (state.start && tile.walkable) {
        state.pathSet = true;
      } else if (tile.walkable) {
        state.start = tile;
      }
      return;
    }

    case "mouse entered tile": {
      const { tile } = action;
      if (
        !state.editMode &&
        !state.pathSet &&
        state.start &&
        tile.walkable &&
        !tile.start
      ) {
        state.end = tile;
      }
      return;
    }

    default:
      return state;
  }
}

const GameContainer = styled.div`
  display: flex;
  box-shadow: 10px 10px 10px 0px silver;
  position: absolute;
  align-items: center;
  justify-content: center;
  justify-items: center;
  margin-top: 40px;
  margin-left: 40px;
`;

const GridContainer = styled(Paper)`
  background: linear-gradient(to bottom, #8e9eab, #eef2f3);
  display: grid;
  grid-template-rows: repeat(8, 64px);
  grid-auto-flow: column;
  grid-auto-columns: 64px;
  grid-auto-rows: 64px;
`;

function getHoverColor({ editMode, tile }) {
  if (editMode) {
    return tile.walkable ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.6)";
  } else {
    return tile.walkable ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.8)";
  }
}

const Tile = styled.div`
  border-bottom: 1px solid black;
  border-right: 1px solid black;
  background-color: ${props =>
    props.tile.walkable ? "transparent" : "rgba(0,0,0,0.8)"};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier() (0.25, 0.8, 0.25, 1);
  user-select: none;
  &:hover {
    background-color: ${getHoverColor};
  }
`;

function getIconColor(tile) {
  if (tile.isStart) {
    return "green";
  } else if (tile.isEnd) {
    return "Orangered";
  } else if (tile.inPath) {
    return "white";
  } else {
    return "AntiqueWhite";
  }
}

function TileIcon({ tile, pathSet }) {
  if (tile.isStart || tile.inPath || tile.isEnd) {
    const color = getIconColor(tile);
    if (tile.isEnd && !pathSet) {
      return <MoodOutlinedIcon fontSize="large" style={{ color }} />;
    } else {
      return <MoodIcon fontSize="large" style={{ color }} />;
    }
  }
  return null;
}

function App() {
  const [state, dispatch] = useImmerReducer(reducer, initialState);
  const tiles = computeTiles(state);

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <Toolbar
        algorithm={state.algorithm}
        algorithms={algorithms}
        handleAlgorithmChange={e =>
          dispatch({ type: `algorithm changed`, algorithm: e.target.value })
        }
        allowDiagonal={state.allowDiagonal}
        handleAllowDiagonalChange={() =>
          dispatch({ type: "allow diagonal toggled" })
        }
      />
      <div
        className="outer"
        style={{
          height: "600px",
          width: "600px",
          backgroundColor: "white",
          alignContent: "center",
          justifyContent: "center",
          borderRadius: "20px"
        }}
      >
        <GameContainer>
          <div style={{ flex: 1 }} />
          <GridContainer>
            {tiles.map((tile, i) => (
              <Tile
                key={i}
                tile={tile}
                onClick={() => dispatch({ type: "tile clicked", tile })}
                onMouseEnter={() =>
                  dispatch({ type: "mouse entered tile", tile })
                }
              >
                <TileIcon tile={tile} pathSet={state.pathSet} />
              </Tile>
            ))}
          </GridContainer>
        </GameContainer>
      </div>
    </MuiThemeProvider>
  );
}

const rootElement = document.getElementById("root");
ReactDOM.render(<App />, rootElement);
