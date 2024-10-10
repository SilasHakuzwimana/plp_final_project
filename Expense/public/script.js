document.addEventListener('DOMContentLoaded', () => {
    // Registration form submission
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(registerForm);
            const full_name = formData.get('full_name');
            const username = formData.get('username');
            const email = formData.get('email');
            const password = formData.get('password');

            try {
                const response = await fetch('/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ full_name, username, email, password })
                });

                if (response.ok) {
                    alert('Registration successful!');
                    window.location.href = '/login';
                } else {
                    const result = await response.json();
                    alert('Registration failed: ' + result.errors.map(err => err.msg).join(', '));
                }
            } catch (error) {
                console.error('Error:', error);
                alert('An error occurred during registration.');
            }
        });
    }

    // Login form submission
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(loginForm);
            const username = formData.get('username');
            const password = formData.get('password');

            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });

                if (response.ok) {
                    alert('Login successful!');
                    window.location.href = '/dashboard';
                } else {
                    const result = await response.json();
                    alert('Login failed: ' + result.message);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('An error occurred during login.');
            }
        });
    }

    // Update the footer year
    const yearSpan = document.getElementById('year');
    if (yearSpan) {
        const currentYear = new Date().getFullYear();
        yearSpan.textContent = currentYear;
    }

    // Add expense form submission
    const addExpenseForm = document.getElementById('add-expense-form');
    if (addExpenseForm) {
        addExpenseForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.querySelector('#item_name').value;
            const category = document.querySelector('#category').value;
            const amount = document.querySelector('#amount').value;
            const date = document.querySelector('#date').value;
            const description = document.querySelector('#description').value;

            const expenseData = { name, category, amount, date, description };

            try {
                const response = await fetch('/add-expense', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(expenseData)
                });

                const result = await response.json();

                if (response.ok) {
                    alert('Expense added successfully!');
                    // Optionally, clear the form or update the UI
                } else {
                    console.error('Failed to save expense:', result);
                    alert(`Failed to save expense: ${result.errors.map(error => error.msg).join(', ')}`);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('An error occurred while saving the expense.');
            }
        });
    }

    // Handle View All Expenses button click
    const viewExpensesBtn = document.getElementById('view-expenses-btn');
    if (viewExpensesBtn) {
        viewExpensesBtn.addEventListener('click', () => {
            alert('Redirect to view all expenses.');
        });
    }

    // Handle form submission for expense updates
    const expenseForm = document.getElementById('expense-form');
    if (expenseForm) {
        expenseForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const expenseId = document.getElementById('expense-id').value;
            const name = document.getElementById('expense-name').value;
            const category = document.getElementById('expense-category').value;
            const amount = document.getElementById('expense-amount').value;
            const date = document.getElementById('expense-date').value;
            const description = document.getElementById('expense-description').value;

            const expenseData = { name, category, amount, date, description };

            try {
                const response = await fetch(expenseId ? `/update-expense/${expenseId}` : '/add-expense', {
                    method: expenseId ? 'PUT' : 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(expenseData)
                });

                if (response.ok) {
                    alert('Expense saved successfully');
                    document.getElementById('expense-form-section').style.display = 'none';
                } else {
                    const errorMessage = await response.text();
                    alert(`Failed to save expense: ${errorMessage}`);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('An error occurred while saving the expense.');
            }
        });
    }

    // Function to show the expense form
    function showExpenseForm(heading, expense = {}) {
        document.getElementById('expense-form-section').style.display = 'block';
        document.getElementById('form-heading').innerText = heading;
        document.getElementById('expense-id').value = expense.id || '';
        document.getElementById('expense-name').value = expense.name || '';
        document.getElementById('expense-category').value = expense.category || '';
        document.getElementById('expense-amount').value = expense.amount || '';
        document.getElementById('expense-date').value = expense.date || '';
        document.getElementById('expense-description').value = expense.description || '';
    }

    async function fetchExpenseData(expenseId) {
        try {
            const response = await fetch(`/get-expense/${expenseId}`);
            if (response.ok) {
                const expense = await response.json();
                showExpenseForm('Edit Expense', expense);
            } else {
                alert('Failed to fetch expense data.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while fetching expense data.');
        }
    }

    // Add event listener for editing expenses
    const expenseList = document.getElementById('expense-list');
    if (expenseList) {
        expenseList.addEventListener('click', (e) => {
            if (e.target.classList.contains('edit-btn')) {
                const expenseId = e.target.getAttribute('data-id');
                fetchExpenseData(expenseId);
            }
        });
    }

    // Add Category form submission
    const addCategoryForm = document.getElementById('add-category-form');
    if (addCategoryForm) {
        addCategoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(addCategoryForm);
            const category_name = formData.get('category_name');

            try {
                const response = await fetch('/add-category', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ category_name })
                });

                if (response.ok) {
                    alert('Category added successfully');
                    // window.location.href = '/view-categories.html';
                } else {
                    const errorMessage = await response.text();
                    alert(`Failed to add category: ${errorMessage}`);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('An error occurred while adding the category.');
            }
        });
    }

    // Add budget form submission
    const addBudgetForm = document.getElementById('set-budget-form');
    if (addBudgetForm) {
        addBudgetForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(addBudgetForm);
            const new_amount = formData.get('amount');

            try {
                const response = await fetch('/add-budget', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ new_amount })
                });

                if (response.ok) {
                    alert('Budget set successfully');
                    window.location.href = '/budget.html';
                } else {
                    const errorMessage = await response.text();
                    alert(`Failed to set budget: ${errorMessage}`);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('An error occurred while setting the budget.');
            }
        });
    }

    // Contact form submission
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Prevent the form from submitting the traditional way

            const formData = new FormData(contactForm);

            // Log formData entries to verify
            for (const [key, value] of formData.entries()) {
                console.log(`${key}: ${value}`);
            }

            const messageDiv = document.getElementById('form-message');

            try {
                const response = await fetch('/send-message', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    const data = await response.json();
                    messageDiv.textContent = data.message || "Your message has been sent successfully!";
                    messageDiv.className = "message success";
                    messageDiv.style.display = "block";
                    contactForm.reset();
                } else {
                    const data = await response.json();
                    messageDiv.textContent = data.error || "There was an error sending your message. Please try again.";
                    messageDiv.className = "message error";
                    messageDiv.style.display = "block";
                }
            } catch (error) {
                messageDiv.textContent = "There was an error sending your message. Please try again.";
                messageDiv.className = "message error";
                messageDiv.style.display = "block";
                console.error('Error:', error);
            }
        });
    }
});
