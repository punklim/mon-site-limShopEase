const token = localStorage.getItem("token");

if(!token){
  window.location.href = "login.html";
}

fetch("/api/products", {
  headers: { Authorization: token }
})
.then(res => res.json())
.then(products => {
  document.getElementById("totalProducts").innerText = products.length;
});

fetch("/api/orders", {
  headers: { Authorization: token }
})
.then(res => res.json())
.then(orders => {
  document.getElementById("totalOrders").innerText = orders.length;

  const ctx = document.getElementById('salesChart');

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
      datasets: [{
        label: 'Sales (€)',
        data: [1200, 1900, 800, 2100, 1500],
      }]
    }
  });
});

function logout(){
  localStorage.removeItem("token");
  window.location.href = "login.html";
}