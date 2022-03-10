// (async () => {
//   try {
//     console.time("set request");
//     await redisClient.json.set("main", ".", {
//       count: 1,
//       rollNo: "19ec01023",
//       name: "Sathiya Seelan"
//     })
//     console.timeEnd("set request");
//     console.time("get request");
//     let name = await redisClient.json.get("main", {
//       path: "name"
//     });
//     console.timeEnd("get request");
//     console.log(name);
//   } catch (e) {
//     console.error(e);
//   }
// })();

let arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
// create a set with the values from the array
let set = new Set(arr);
console.log(set);
