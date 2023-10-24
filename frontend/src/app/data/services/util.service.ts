import { DestroyRef, Injectable, inject } from '@angular/core';
import { MonoTypeOperatorFunction, Observable, Subject, takeUntil } from 'rxjs';
import { Axis } from '../models/Axis';

@Injectable({
  providedIn: 'root'
})
export class UtilService {
  constructor() { }
}

export function fillArray(arrayWidth: number, fillValue: number): number[] {
  return Array(arrayWidth).fill(fillValue)
}

export function fillMatrix(matrixWidth: number, matrixHeight: number, fillValue: number | string): number[][] | string[][]{
    return Array(matrixHeight).fill(fillValue).map(() => Array(matrixWidth).fill(fillValue));
}

export function findEmptyBoardCells(board: string[][]): number[]{
  let emptyCellPositions: number[] = [];
  board.flat().forEach((cell, cellIndex)=> cell === '0' && emptyCellPositions.push(cellIndex));
  return emptyCellPositions;
}

export function findEmptyBoardCellsForArray(board: string[]): number[]{
  let emptyCellPositions: number[] = [];
  board.filter(cell => cell === '0').forEach((cell, cellIndex)=> emptyCellPositions.push(cellIndex));
  return emptyCellPositions;
}

export function arrayToMatrix(array: string[], rows: number, columns: number): string[][] {
  let matrix = [];
  for (let i = 0; i < rows; i++) {
    matrix[i] = array.slice(i * columns, (i + 1) * columns);
  }
  return matrix;
}

export function calcArrayPositionToMatrixCords(position: number, matrixXLenght: number, matrixYLenght: number): Axis{
  const x = position % matrixXLenght;
  const y = Math.floor(position / matrixYLenght);

  return {x, y};
}

export function ramdomNumber(includeZero: boolean, maxNumber: number){
  const num = includeZero ? 0 : 1;
  return Math.floor(Math.random() * maxNumber) + num;
}

export function destroy() {
  const subject = new Subject();

  inject(DestroyRef).onDestroy(() => {
    subject.next(true);
    subject.complete();
  });

  return () => takeUntil(subject.asObservable());
}