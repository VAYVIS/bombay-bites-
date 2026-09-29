import { supabase } from './supabaseClient.js';


// =====================================================
// SIGN UP
// =====================================================

const signupForm = document.getElementById('signupForm');

if (signupForm) {

  signupForm.addEventListener('submit', async (e) => {

    e.preventDefault();


    const fullName =
      document.getElementById('fullName').value.trim();

    const email =
      document.getElementById('email').value.trim();

    const password =
      document.getElementById('password').value;


    const errorBox =
      document.getElementById('signupError');

    const successBox =
      document.getElementById('signupSuccess');

    const btn =
      document.getElementById('signupBtn');


    errorBox.style.display = 'none';
    successBox.style.display = 'none';


    btn.disabled = true;
    btn.textContent = 'Creating account...';


    const { data, error } =
      await supabase.auth.signUp({

        email: email,

        password: password,

        options: {
          data: {
            full_name: fullName
          }
        }

      });


    btn.disabled = false;
    btn.textContent = 'Sign Up';


    if (error) {

      errorBox.textContent = error.message;

      errorBox.style.display = 'block';

      return;
    }


    successBox.textContent =
      'Account created! You can now sign in.';

    successBox.style.display = 'block';


    signupForm.reset();


    setTimeout(() => {

      window.location.href = 'login.html';

    }, 1500);

  });

}



// =====================================================
// LOGIN
// =====================================================

const loginForm = document.getElementById('loginForm');

if (loginForm) {

  loginForm.addEventListener('submit', async (e) => {

    e.preventDefault();


    const email =
      document.getElementById('email').value.trim();

    const password =
      document.getElementById('password').value;


    const errorBox =
      document.getElementById('loginError');

    const btn =
      document.getElementById('loginBtn');


    errorBox.style.display = 'none';


    btn.disabled = true;
    btn.textContent = 'Signing in...';


    const { data, error } =
      await supabase.auth.signInWithPassword({

        email: email,

        password: password

      });


    btn.disabled = false;
    btn.textContent = 'Sign In';


    if (error) {

      errorBox.textContent = error.message;

      errorBox.style.display = 'block';

      return;
    }


    // Supabase automatically keeps the session.
    window.location.href = 'dashboard.html';

  });

}



// =====================================================
// AUTH GUARD
// =====================================================

export async function requireAuth() {

  const {
    data: { session }
  } = await supabase.auth.getSession();


  if (!session) {

    window.location.href = 'login.html';

    return null;
  }


  return session;
}



// =====================================================
// LOGOUT
// =====================================================

export async function logout() {

  await supabase.auth.signOut();

  window.location.href = 'login.html';

}