import { useState } from "react";
import { useNavigate } from "react-router-dom";
import GroupForm from "../components/GroupForm";


export default function CreateGroupPage() {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSaveGroup(formData) {
    try {
      setIsSaving(true);
      setError("");

      const token = localStorage.getItem("token");

      if (!token) {
        setError("You need to log in first.");
        setIsSaving(false);
        return;
      }

      const response = await fetch("http://localhost:3001/groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create group");
      }

      alert(data.message || "Group created successfully");

      // store group id if you want to use it later
      localStorage.setItem("groupId", data.group._id);

      // redirect to the group details page
      navigate(`/groups/${data.group._id}`);
    } catch (err) {
      console.error("Error creating group:", err);
      setError(err.message || "Something went wrong while saving the group.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <GroupForm
      onSave={handleSaveGroup}
      isSaving={isSaving}
      error={error}
    />
  );
} 