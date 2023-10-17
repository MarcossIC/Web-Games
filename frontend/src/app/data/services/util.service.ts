import { DestroyRef, Injectable, inject } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UtilService {
  constructor() { }
}

export function fillArray(arrayWidth: number, fillValue: number): number[]{
  return Array(arrayWidth).fill(fillValue)
}

export function fillMatrix(matrixWidth: number, matrixHeight: number, fillValue: number): number[][]{
    return Array(matrixHeight).fill(fillValue).map(() => Array(matrixWidth).fill(fillValue));
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