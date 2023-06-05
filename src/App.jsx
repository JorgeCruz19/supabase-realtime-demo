import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import "./App.css";

function App() {
  const supabase = createClient("http://localhost:8000", `${import.meta.env.VITE_SUPABASE_ANON_KEY}`);

  const [projects, setprojects] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState([]);
  const [id, setId] = useState(null);
  const [isUpdate, setIsUpdate] = useState(false);

  useEffect(() => {
    async function getAllProjects() {
      const { data, error } = await supabase.from("projects").select("*");
      if (error) {
        console.log(error);
        return;
      }
      setprojects(data);
    }
    getAllProjects();
  }, []);

  useEffect(() => {
    const projects = supabase
      .channel("table-db-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setprojects((prev) => [...prev, payload.new]);
          return;
        }

        if (payload.eventType === "UPDATE") {
          setprojects((prev) => prev.map((project) => (project.id === payload.new.id ? payload.new : project)));
          return;
        }

        if (payload.eventType === "DELETE") {
          setprojects((prev) => prev.filter((project) => project.id !== payload.old.id));
          return;
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(projects);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title || !description) {
      return;
    }

    if (isUpdate) {
      const { error } = await supabase.from("projects").update({ title, description }).match({ id });
      setIsUpdate(false);
      if (error) {
        console.log(error);
        return;
      }
    } else {
      const { error } = await supabase.from("projects").insert({ title, description });
      if (error) {
        console.log(error);
        return;
      }
    }
    setTitle("");
    setDescription("");
  };

  const handleSetValuesToUpdate = (project) => {
    setIsUpdate(true);
    setId(project.id);
    setTitle(project.title);
    setDescription(project.description);

  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from("projects").delete().match({ id }).select("*");
    if (error) {
      console.log(error);
      return;
    }
  };

  return (
    <>
      <h1>¡Save your project!</h1>
      <form onSubmit={handleSubmit}>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter a title" />
        <br />
        <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Enter a description" />
        <br />
        {isUpdate ? <button>Actualizar</button> : <button>Guardar</button>}
      </form>

      <ul>
        {projects.map((project) => (
          <li key={project.id}>
            <h3>{project.title}</h3>
            <p>{project.description}</p>
            <button onClick={() => handleSetValuesToUpdate(project)}>Update</button>
            <button onClick={() => handleDelete(project.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </>
  );
}

export default App;
