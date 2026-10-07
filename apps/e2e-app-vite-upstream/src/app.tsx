import { Route, Routes } from "react-router-dom";
import { DetailPage } from "./detail-page";
import { HomePage } from "./home-page";

export const App = () => (
  <Routes>
    <Route element={<HomePage />} path="/" />
    <Route element={<DetailPage />} path="/detail" />
  </Routes>
);
