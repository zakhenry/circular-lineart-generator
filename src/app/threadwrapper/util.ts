
function* getRandomArrayElementIterator<T>(arr: T[]): IterableIterator<T> {
  while (true) {
    yield getRandomArrayElement(arr);
  }
}


function getRandomArrayElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
