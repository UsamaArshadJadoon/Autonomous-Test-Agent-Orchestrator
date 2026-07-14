const ac = 'Given user is logged in When user clicks logout Then user is redirected to login page';

const givenMatch = ac.match(/Given\s+(.+?)(?=\s+When|\s+Then|$)/is);
const whenMatch = ac.match(/When\s+(.+?)(?=\s+Then|$)/is);
const thenMatch = ac.match(/Then\s+(.+?)$/is);

console.log('AC:', ac);
console.log('Given match:', givenMatch);
console.log('When match:', whenMatch);
console.log('Then match:', thenMatch);
