import { json } from '@sveltejs/kit';

export async function GET({ locals }) {
  if (locals.user) {
    return json({ 
      authenticated: true, 
      user: { username: locals.user.username }
    });
  }
  
  return json({ authenticated: false });
}
