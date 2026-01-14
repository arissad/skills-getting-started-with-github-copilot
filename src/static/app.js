document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helper to escape HTML in participant names/emails
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message and activity select options (keep placeholder)
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants section (bulleted list or fallback text)
        let participantsHTML = "";
        if (Array.isArray(details.participants) && details.participants.length > 0) {
          const items = details.participants
            .map((p) => `<li data-email="${escapeHtml(p)}" data-activity="${escapeHtml(name)}">${escapeHtml(p)}</li>`)
            .join("");
          participantsHTML = `
            <div class="participants-section">
              <h5 class="participants-title">Participants</h5>
              <div class="participants-list">
                <ul>${items}</ul>
              </div>
            </div>
          `;
        } else {
          participantsHTML = `
            <div class="participants-section">
              <h5 class="participants-title">Participants</h5>
              <div class="participants-empty">No participants yet.</div>
            </div>
          `;
        }

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsHTML}
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // After rendering participants, attach delete icons
      addDeleteIcons();
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Function to unregister a participant
  async function unregisterParticipant(email, activityName) {
    try {
      const url = `/activities/${encodeURIComponent(activityName)}/unregister?email=${encodeURIComponent(email)}`;
      const response = await fetch(url, { method: 'DELETE' });
      if (response.ok) {
        // Re-fetch activities to refresh UI
        await fetchActivities();
      } else {
        console.error('Failed to unregister participant.');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  // Add delete icons next to each participant
  function addDeleteIcons() {
    const participantItems = document.querySelectorAll('#activities-list li');
    participantItems.forEach(item => {
      // Avoid adding multiple delete icons if present
      if (item.querySelector('.delete-icon')) return;

      const email = item.getAttribute('data-email');
      const activityName = item.getAttribute('data-activity');
      const deleteIcon = document.createElement('span');
      deleteIcon.className = 'delete-icon';
      deleteIcon.textContent = ' 🗑️'; // Unicode for trash can
      deleteIcon.style.cursor = 'pointer';
      deleteIcon.addEventListener('click', () => unregisterParticipant(email, activityName));
      item.appendChild(deleteIcon);
    });
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities to show the new participant without page reload
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities().then(addDeleteIcons);
});
