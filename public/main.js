const registerForm = document.getElementById("registerForm");
if(registerForm){
  registerForm.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const res = await fetch("/api/auth/register", {
      method:"POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({name,email,password})
    });

    const data = await res.json();
    document.getElementById("message").innerText = JSON.stringify(data);
  });
}

const loginForm = document.getElementById("loginForm");
if(loginForm){
  loginForm.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const res = await fetch("/api/auth/login", {
      method:"POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({email,password})
    });

    const data = await res.json();
    if(data.token){
      localStorage.setItem("token", data.token);
      document.getElementById("message").innerText = "Login success!";
      window.location.href = "index.html";
    } else {
      document.getElementById("message").innerText = JSON.stringify(data);
    }
  });
}