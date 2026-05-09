import { hash } from "bcrypt";

(async () => {
  const pass = await hash("123", 10);

  console.log(pass);
})();
